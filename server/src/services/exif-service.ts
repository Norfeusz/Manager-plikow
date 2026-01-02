import exifr from 'exifr'
import path from 'path'
import fs from 'fs-extra'

export interface ExifData {
  dateTime?: Date
  dateTimeOriginal?: Date
  dateTimeDigitized?: Date
  make?: string
  model?: string
  orientation?: number
  width?: number
  height?: number
  exposureTime?: number
  fNumber?: number
  iso?: number
  focalLength?: number
  lens?: string
  gps?: {
    latitude?: number
    longitude?: number
    altitude?: number
  }
}

export class ExifService {
  /**
   * Odczytuje metadane EXIF z pliku zdjęcia
   */
  async readExif(filePath: string): Promise<ExifData | null> {
    try {
      // Sprawdź czy plik istnieje
      const exists = await fs.pathExists(filePath)
      if (!exists) {
        console.error(`Plik nie istnieje: ${filePath}`)
        return null
      }

      // Sprawdź czy to plik graficzny
      const ext = path.extname(filePath).toLowerCase()
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.heic', '.heif', '.webp']
      
      if (!imageExtensions.includes(ext)) {
        console.log(`Plik nie jest obrazem: ${filePath}`)
        return null
      }

      // Odczytaj EXIF
      const exif = await exifr.parse(filePath, {
        pick: [
          'DateTime',
          'DateTimeOriginal',
          'DateTimeDigitized',
          'Make',
          'Model',
          'Orientation',
          'ExifImageWidth',
          'ExifImageHeight',
          'ExposureTime',
          'FNumber',
          'ISO',
          'FocalLength',
          'LensModel',
          'latitude',
          'longitude',
          'altitude'
        ]
      })

      if (!exif) {
        console.log(`Brak danych EXIF w pliku: ${filePath}`)
        return null
      }

      // Przetwórz dane
      const result: ExifData = {}

      if (exif.DateTime) result.dateTime = new Date(exif.DateTime)
      if (exif.DateTimeOriginal) result.dateTimeOriginal = new Date(exif.DateTimeOriginal)
      if (exif.DateTimeDigitized) result.dateTimeDigitized = new Date(exif.DateTimeDigitized)
      
      if (exif.Make) result.make = exif.Make
      if (exif.Model) result.model = exif.Model
      if (exif.Orientation) result.orientation = exif.Orientation
      if (exif.ExifImageWidth) result.width = exif.ExifImageWidth
      if (exif.ExifImageHeight) result.height = exif.ExifImageHeight
      if (exif.ExposureTime) result.exposureTime = exif.ExposureTime
      if (exif.FNumber) result.fNumber = exif.FNumber
      if (exif.ISO) result.iso = exif.ISO
      if (exif.FocalLength) result.focalLength = exif.FocalLength
      if (exif.LensModel) result.lens = exif.LensModel

      if (exif.latitude !== undefined && exif.longitude !== undefined) {
        result.gps = {
          latitude: exif.latitude,
          longitude: exif.longitude,
          altitude: exif.altitude
        }
      }

      return result
    } catch (error: any) {
      console.error(`Błąd odczytu EXIF z pliku ${filePath}:`, error.message)
      return null
    }
  }

  /**
   * Pobiera datę wykonania zdjęcia (priorytet: DateTimeOriginal > DateTimeDigitized > DateTime)
   */
  async getPhotoDate(filePath: string): Promise<Date | null> {
    const exif = await this.readExif(filePath)
    if (!exif) return null

    return exif.dateTimeOriginal || exif.dateTimeDigitized || exif.dateTime || null
  }

  /**
   * Generuje nową nazwę pliku w formacie YYYY-MM-DD_oryginalna-nazwa.ext
   */
  async generatePhotoName(filePath: string): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath)
    if (!photoDate) return null

    const year = photoDate.getFullYear()
    const month = String(photoDate.getMonth() + 1).padStart(2, '0')
    const day = String(photoDate.getDate()).padStart(2, '0')

    const originalName = path.basename(filePath, path.extname(filePath))
    const extension = path.extname(filePath)

    return `${year}-${month}-${day}_${originalName}${extension}`
  }

  /**
   * Generuje strukturę folderów YYYY/MM dla danego zdjęcia
   */
  async generatePhotoPath(filePath: string, baseDir: string): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath)
    if (!photoDate) return null

    const year = photoDate.getFullYear()
    const month = String(photoDate.getMonth() + 1).padStart(2, '0')

    return path.join(baseDir, String(year), month)
  }

  /**
   * Generuje pełną ścieżkę docelową dla zdjęcia (folder + nazwa)
   */
  async generateFullPhotoPath(filePath: string, baseDir: string): Promise<string | null> {
    const folder = await this.generatePhotoPath(filePath, baseDir)
    const newName = await this.generatePhotoName(filePath)

    if (!folder || !newName) return null

    return path.join(folder, newName)
  }
}
