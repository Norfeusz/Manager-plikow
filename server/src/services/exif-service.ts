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
   * Pobiera datę wykonania zdjęcia (priorytet: EXIF DateTimeOriginal > DateTimeDigitized > DateTime > data utworzenia pliku)
   * Używa daty z właściwości pliku jako fallback gdy brak EXIF
   */
  async getPhotoDate(filePath: string): Promise<Date | null> {
    const exif = await this.readExif(filePath)
    
    // Sprawdź dane EXIF
    if (exif) {
      const exifDate = exif.dateTimeOriginal || exif.dateTimeDigitized || exif.dateTime
      if (exifDate) {
        console.log(`Używam daty EXIF dla: ${path.basename(filePath)}`)
        return exifDate
      }
    }

    // Fallback: użyj daty z właściwości pliku
    try {
      const stats = await fs.stat(filePath)
      // mtime = data modyfikacji (zachowuje się przy kopiowaniu)
      // birthtime = data utworzenia (zmienia się przy kopiowaniu)
      // Preferuj mtime bo jest bardziej niezawodna
      const fileDate = stats.mtime || stats.birthtime
      console.log(`Brak EXIF - używam daty pliku (${stats.mtime ? 'modyfikacji' : 'utworzenia'}) dla: ${path.basename(filePath)}`)
      return fileDate
    } catch (error) {
      console.error(`Nie można odczytać daty pliku ${filePath}:`, error)
      return null
    }
  }

  /**
   * Generuje nową nazwę pliku w formacie YYYY-MM-DD_oryginalna-nazwa.ext
   * Jeśli brak daty, zwraca oryginalną nazwę
   */
  async generatePhotoName(filePath: string, keepOriginalIfNoDate: boolean = false): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath)
    
    if (!photoDate) {
      if (keepOriginalIfNoDate) {
        // Zachowaj oryginalną nazwę pliku
        return path.basename(filePath)
      }
      return null
    }

    const year = photoDate.getFullYear()
    const month = String(photoDate.getMonth() + 1).padStart(2, '0')
    const day = String(photoDate.getDate()).padStart(2, '0')

    const originalName = path.basename(filePath, path.extname(filePath))
    const extension = path.extname(filePath)

    return `${year}-${month}-${day}_${originalName}${extension}`
  }

  /**
   * Generuje strukturę folderów dla danego zdjęcia
   * @param filePath - ścieżka do pliku
   * @param baseDir - katalog bazowy
   * @param customFolder - niestandardowa nazwa folderu (opcjonalnie)
   * @param assignToYear - czy przypisywać do roku (tylko dla customFolder)
   */
  async generatePhotoPath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true
  ): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath)

    // Tryb niestandardowego folderu
    if (customFolder) {
      if (assignToYear && photoDate) {
        // Przypisz do roku: baseDir/YYYY/customFolder
        const year = photoDate.getFullYear()
        return path.join(baseDir, String(year), customFolder)
      } else if (!assignToYear) {
        // Nie przypisuj do roku: baseDir/customFolder
        return path.join(baseDir, customFolder)
      } else if (assignToYear && !photoDate) {
        // Brak daty, ale wybrano przypisanie do roku - użyj folderu "Brak daty"
        return path.join(baseDir, 'Brak daty', customFolder)
      }
    }

    // Tryb standardowy (YYYY/MM)
    if (!photoDate) {
      // Brak daty w trybie standardowym - zwróć null (błąd)
      return null
    }

    const year = photoDate.getFullYear()
    const month = String(photoDate.getMonth() + 1).padStart(2, '0')
    return path.join(baseDir, String(year), month)
  }

  /**
   * Generuje pełną ścieżkę docelową dla zdjęcia (folder + nazwa)
   */
  async generateFullPhotoPath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true
  ): Promise<string | null> {
    const folder = await this.generatePhotoPath(filePath, baseDir, customFolder, assignToYear)
    
    // Zachowaj oryginalną nazwę jeśli customFolder bez assignToYear
    const keepOriginalName = customFolder && !assignToYear
    const newName = await this.generatePhotoName(filePath, keepOriginalName)

    if (!folder || !newName) return null

    return path.join(folder, newName)
  }
}
