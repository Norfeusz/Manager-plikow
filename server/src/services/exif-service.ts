import exifr from 'exifr'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import ffmpeg from 'fluent-ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import { GoogleDriveService } from './google-drive/google-drive-service'

// Ustaw ścieżkę do ffprobe
ffmpeg.setFfprobePath(ffprobeInstaller.path)

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
  constructor() {
    // GoogleDriveService będzie tworzony on-demand gdy potrzebny
  }

  /**
   * Odczytuje metadane EXIF z pliku zdjęcia
   */
  async readExif(filePath: string, tokens?: any): Promise<ExifData | null> {
    let tempFilePath: string | null = null
    let isGoogleDrive = false

    try {
      // Google Drive - pobierz plik tymczasowo
      if (filePath.startsWith('gdrive:')) {
        isGoogleDrive = true
        const fileId = filePath.replace('gdrive:', '')
        
        if (!tokens) {
          console.log(`Brak autoryzacji Google Drive dla: ${filePath}`)
          return null
        }

        // Utwórz instancję serwisu Google Drive
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)

        // Pobierz metadane aby uzyskać nazwę pliku
        const metadata = await driveService.getFileMetadata(fileId)
        const fileName = metadata.name || 'temp_file'
        
        // Utwórz tymczasowy plik
        tempFilePath = path.join(os.tmpdir(), `exif_${Date.now()}_${fileName}`)
        
        console.log(`Pobieranie pliku z Google Drive do: ${tempFilePath}`)
        await driveService.downloadFile(fileId, tempFilePath)
        
        // Użyj tymczasowego pliku do odczytu EXIF
        filePath = tempFilePath
      }
      
      // Sprawdź czy plik istnieje (dla lokalnych plików)
      if (!isGoogleDrive) {
        const exists = await fs.pathExists(filePath)
        if (!exists) {
          console.error(`Plik nie istnieje: ${filePath}`)
          return null
        }
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
    } finally {
      // Usuń tymczasowy plik Google Drive
      if (tempFilePath) {
        try {
          await fs.remove(tempFilePath)
          console.log(`Usunięto tymczasowy plik: ${tempFilePath}`)
        } catch (err) {
          console.error(`Nie można usunąć tymczasowego pliku: ${tempFilePath}`, err)
        }
      }
    }
  }

  /**
   * Odczytuje metadane z pliku video
   */
  async readVideoMetadata(filePath: string, tokens?: any): Promise<any> {
    let tempFilePath: string | null = null

    try {
      // Google Drive - pobierz plik tymczasowo
      if (filePath.startsWith('gdrive:')) {
        const fileId = filePath.replace('gdrive:', '')
        
        if (!tokens) {
          console.log(`Brak autoryzacji Google Drive dla: ${filePath}`)
          return null
        }

        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)

        // Pobierz nazwę pliku z metadanych
        const metadata = await driveService.getFileMetadata(fileId)
        const ext = path.extname(metadata.name || '.mp4')
        
        // Utwórz tymczasowy plik
        tempFilePath = path.join(os.tmpdir(), `gd_video_${fileId}${ext}`)
        await driveService.downloadFile(fileId, tempFilePath)
        console.log(`Pobrano plik z Google Drive do: ${tempFilePath}`)

        // Użyj tymczasowego pliku
        filePath = tempFilePath
      }

      return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error(`Błąd ffprobe dla ${path.basename(filePath)}:`, err.message)
            resolve(null)
            return
          }
          resolve(metadata)
        })
      })
    } catch (error: any) {
      console.error(`Błąd odczytu metadanych video z ${filePath}:`, error.message)
      return null
    } finally {
      // Usuń tymczasowy plik Google Drive
      if (tempFilePath) {
        try {
          await fs.remove(tempFilePath)
          console.log(`Usunięto tymczasowy plik: ${tempFilePath}`)
        } catch (err) {
          console.error(`Nie można usunąć tymczasowego pliku: ${tempFilePath}`, err)
        }
      }
    }
  }

  /**
   * Pobiera datę wykonania video (priorytet: metadane video > data modyfikacji pliku)
   */
  async getVideoDate(filePath: string, tokens?: any): Promise<Date | null> {
    const metadata = await this.readVideoMetadata(filePath, tokens)
    
    // Sprawdź metadane video - data utworzenia w tagach
    if (metadata && metadata.format && metadata.format.tags) {
      const tags = metadata.format.tags
      const creationTime = tags.creation_time || tags['com.apple.quicktime.creationdate']
      
      if (creationTime) {
        console.log(`Używam daty z metadanych video dla: ${path.basename(filePath)}`)
        return new Date(creationTime)
      }
    }

    // Google Drive - użyj daty modyfikacji z metadanych
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (!tokens) {
        console.log(`Brak daty dla pliku Google Drive (brak autoryzacji): ${path.basename(filePath)}`)
        return null
      }

      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(fileId)
        
        if (metadata.modifiedTime) {
          const modifiedDate = new Date(metadata.modifiedTime)
          console.log(`Używam daty modyfikacji Google Drive dla: ${metadata.name}`)
          return modifiedDate
        }
      } catch (error) {
        console.error(`Nie można pobrać metadanych Google Drive dla: ${fileId}`, error)
      }
      
      console.log(`Brak daty dla pliku Google Drive: ${path.basename(filePath)}`)
      return null
    }

    // Fallback: użyj daty z właściwości pliku
    try {
      const stats = await fs.stat(filePath)
      const fileDate = stats.mtime || stats.birthtime
      console.log(`Brak metadanych - używam daty pliku (${stats.mtime ? 'modyfikacji' : 'utworzenia'}) dla: ${path.basename(filePath)}`)
      return fileDate
    } catch (error) {
      console.error(`Nie można odczytać daty pliku ${filePath}:`, error)
      return null
    }
  }

  /**
   * Pobiera datę wykonania zdjęcia (priorytet: EXIF DateTimeOriginal > DateTimeDigitized > DateTime > data utworzenia pliku)
   * Używa daty z właściwości pliku jako fallback gdy brak EXIF
   */
  async getPhotoDate(filePath: string, tokens?: any): Promise<Date | null> {
    const exif = await this.readExif(filePath, tokens)
    
    // Sprawdź dane EXIF
    if (exif) {
      const exifDate = exif.dateTimeOriginal || exif.dateTimeDigitized || exif.dateTime
      if (exifDate) {
        console.log(`Używam daty EXIF dla: ${path.basename(filePath)}`)
        return exifDate
      }
    }

    // Google Drive - użyj daty modyfikacji z metadanych
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (!tokens) {
        console.log(`Brak daty dla pliku Google Drive (brak autoryzacji): ${path.basename(filePath)}`)
        return null
      }

      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(fileId)
        
        // Użyj modifiedTime z Google Drive
        if (metadata.modifiedTime) {
          const modifiedDate = new Date(metadata.modifiedTime)
          console.log(`Używam daty modyfikacji Google Drive dla: ${metadata.name}`)
          return modifiedDate
        }
      } catch (error) {
        console.error(`Nie można pobrać metadanych Google Drive dla: ${fileId}`, error)
      }
      
      console.log(`Brak daty dla pliku Google Drive: ${path.basename(filePath)}`)
      return null
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
  async generatePhotoName(filePath: string, keepOriginalIfNoDate: boolean = false, tokens?: any): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath, tokens)
    
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

    // Dla plików Google Drive, pobierz oryginalną nazwę z metadanych
    let originalName: string
    
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const metadata = await driveService.getFileMetadata(fileId)
          originalName = path.basename(metadata.name || 'file', path.extname(metadata.name || ''))
        } catch {
          originalName = fileId
        }
      } else {
        originalName = fileId
      }
    } else {
      originalName = path.basename(filePath, path.extname(filePath))
    }
    
    const extension = filePath.startsWith('gdrive:') ? '' : path.extname(filePath)
    
    // Dla Google Drive pobierz rozszerzenie z metadanych jeśli potrzebne
    if (filePath.startsWith('gdrive:') && tokens) {
      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(filePath.replace('gdrive:', ''))
        const ext = path.extname(metadata.name || '')
        return `${year}-${month}-${day}_${originalName}${ext}`
      } catch {
        return `${year}-${month}-${day}_${originalName}${extension}`
      }
    }

    return `${year}-${month}-${day}_${originalName}${extension}`
  }

  /**
   * Generuje nową nazwę pliku video w formacie YYYY-MM-DD_oryginalna-nazwa.ext
   */
  async generateVideoName(filePath: string, keepOriginalIfNoDate: boolean = false, tokens?: any): Promise<string | null> {
    const videoDate = await this.getVideoDate(filePath, tokens)
    
    if (!videoDate) {
      if (keepOriginalIfNoDate) {
        return path.basename(filePath)
      }
      return null
    }

    const year = videoDate.getFullYear()
    const month = String(videoDate.getMonth() + 1).padStart(2, '0')
    const day = String(videoDate.getDate()).padStart(2, '0')

    let originalName: string
    
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const metadata = await driveService.getFileMetadata(fileId)
          originalName = path.basename(metadata.name || 'file', path.extname(metadata.name || ''))
        } catch {
          originalName = fileId
        }
      } else {
        originalName = fileId
      }
    } else {
      originalName = path.basename(filePath, path.extname(filePath))
    }
    
    const extension = filePath.startsWith('gdrive:') ? '' : path.extname(filePath)
    
    if (filePath.startsWith('gdrive:') && tokens) {
      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(filePath.replace('gdrive:', ''))
        const ext = path.extname(metadata.name || '')
        return `${year}-${month}-${day}_${originalName}${ext}`
      } catch {
        return `${year}-${month}-${day}_${originalName}${extension}`
      }
    }

    return `${year}-${month}-${day}_${originalName}${extension}`
  }

  /**
   * Generuje strukturę folderów dla danego video
   */
  async generateVideoPath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const videoDate = await this.getVideoDate(filePath, tokens)

    if (customFolder) {
      if (assignToYear && videoDate) {
        const year = videoDate.getFullYear()
        return path.join(baseDir, String(year), customFolder)
      } else if (!assignToYear) {
        return path.join(baseDir, customFolder)
      } else if (assignToYear && !videoDate) {
        return path.join(baseDir, 'Brak daty', customFolder)
      }
    }

    if (!videoDate) {
      return null
    }

    const year = videoDate.getFullYear()
    const month = String(videoDate.getMonth() + 1).padStart(2, '0')
    return path.join(baseDir, String(year), month)
  }

  /**
   * Generuje pełną ścieżkę docelową dla video
   */
  async generateFullVideoPath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const folder = await this.generateVideoPath(filePath, baseDir, customFolder, assignToYear, tokens)
    const keepOriginalName = !!(customFolder && !assignToYear)
    const newName = await this.generateVideoName(filePath, keepOriginalName, tokens)

    if (!folder || !newName) return null

    return path.join(folder, newName)
  }

  /**
   * Generuje strukturę folderów dla danego zdjęcia
   * @param filePath - ścieżka do pliku
   * @param baseDir - katalog bazowy
   * @param customFolder - niestandardowa nazwa folderu (opcjonalnie)
   * @param assignToYear - czy przypisywać do roku (tylko dla customFolder)
   * @param tokens - tokeny Google Drive (opcjonalnie)
   */
  async generatePhotoPath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const photoDate = await this.getPhotoDate(filePath, tokens)

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
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const folder = await this.generatePhotoPath(filePath, baseDir, customFolder, assignToYear, tokens)
    
    // Zachowaj oryginalną nazwę jeśli customFolder bez assignToYear
    const keepOriginalName = !!(customFolder && !assignToYear)
    const newName = await this.generatePhotoName(filePath, keepOriginalName, tokens)

    if (!folder || !newName) return null

    return path.join(folder, newName)
  }

  /**
   * Pobiera datę pliku (mtime) dla plików bez metadanych (PDF, dokumenty, archiwa, itp.)
   */
  async getFileDate(filePath: string, tokens?: any): Promise<Date | null> {
    // Google Drive - użyj daty modyfikacji z metadanych
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (!tokens) {
        console.log(`Brak daty dla pliku Google Drive (brak autoryzacji): ${path.basename(filePath)}`)
        return null
      }

      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(fileId)
        
        if (metadata.modifiedTime) {
          const modifiedDate = new Date(metadata.modifiedTime)
          console.log(`Używam daty modyfikacji Google Drive dla: ${metadata.name}`)
          return modifiedDate
        }
      } catch (error) {
        console.error(`Nie można pobrać metadanych Google Drive dla: ${fileId}`, error)
      }
      
      console.log(`Brak daty dla pliku Google Drive: ${path.basename(filePath)}`)
      return null
    }

    // Lokalny plik - użyj mtime
    try {
      const stats = await fs.stat(filePath)
      const fileDate = stats.mtime || stats.birthtime
      console.log(`Używam daty pliku (${stats.mtime ? 'modyfikacji' : 'utworzenia'}) dla: ${path.basename(filePath)}`)
      return fileDate
    } catch (error) {
      console.error(`Nie można odczytać daty pliku ${filePath}:`, error)
      return null
    }
  }

  /**
   * Generuje nową nazwę dla pliku z datą (YYYY-MM-DD_nazwa) lub zachowuje oryginalną
   */
  async generateFileName(
    filePath: string, 
    renameWithDate: boolean = true, 
    keepOriginalIfNoDate: boolean = false, 
    tokens?: any
  ): Promise<string | null> {
    // Jeśli nie zmieniamy nazwy, zwróć oryginalną
    if (!renameWithDate) {
      if (filePath.startsWith('gdrive:') && tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const metadata = await driveService.getFileMetadata(filePath.replace('gdrive:', ''))
          return path.basename(metadata.name || 'file')
        } catch {
          return path.basename(filePath)
        }
      }
      return path.basename(filePath)
    }

    // Zmiana nazwy z datą
    const fileDate = await this.getFileDate(filePath, tokens)
    
    if (!fileDate) {
      if (keepOriginalIfNoDate) {
        return path.basename(filePath)
      }
      return null
    }

    const year = fileDate.getFullYear()
    const month = String(fileDate.getMonth() + 1).padStart(2, '0')
    const day = String(fileDate.getDate()).padStart(2, '0')

    let originalName: string
    
    if (filePath.startsWith('gdrive:')) {
      const fileId = filePath.replace('gdrive:', '')
      
      if (tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const metadata = await driveService.getFileMetadata(fileId)
          originalName = path.basename(metadata.name || 'file', path.extname(metadata.name || ''))
        } catch {
          originalName = fileId
        }
      } else {
        originalName = fileId
      }
    } else {
      originalName = path.basename(filePath, path.extname(filePath))
    }
    
    const extension = filePath.startsWith('gdrive:') ? '' : path.extname(filePath)
    
    if (filePath.startsWith('gdrive:') && tokens) {
      try {
        const driveService = new GoogleDriveService()
        driveService.setCredentials(tokens)
        const metadata = await driveService.getFileMetadata(filePath.replace('gdrive:', ''))
        const ext = path.extname(metadata.name || '')
        return `${year}-${month}-${day}_${originalName}${ext}`
      } catch {
        return `${year}-${month}-${day}_${originalName}${extension}`
      }
    }

    return `${year}-${month}-${day}_${originalName}${extension}`
  }

  /**
   * Generuje strukturę folderów dla pliku (tylko rok)
   */
  async generateFilePath(
    filePath: string, 
    baseDir: string, 
    customFolder?: string, 
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const fileDate = await this.getFileDate(filePath, tokens)

    if (customFolder) {
      if (assignToYear && fileDate) {
        const year = fileDate.getFullYear()
        return path.join(baseDir, String(year), customFolder)
      } else if (!assignToYear) {
        return path.join(baseDir, customFolder)
      } else if (assignToYear && !fileDate) {
        return path.join(baseDir, 'Brak daty', customFolder)
      }
    }

    if (!fileDate) {
      return null
    }

    const year = fileDate.getFullYear()
    return path.join(baseDir, String(year))
  }

  /**
   * Generuje pełną ścieżkę docelową dla pliku (folder + nazwa)
   */
  async generateFullFilePath(
    filePath: string, 
    baseDir: string, 
    renameWithDate: boolean = true,
    customFolder?: string, 
    assignToYear: boolean = true,
    tokens?: any
  ): Promise<string | null> {
    const folder = await this.generateFilePath(filePath, baseDir, customFolder, assignToYear, tokens)
    const keepOriginalName = !!(customFolder && !assignToYear)
    const newName = await this.generateFileName(filePath, renameWithDate, keepOriginalName, tokens)

    if (!folder || !newName) return null

    return path.join(folder, newName)
  }
}
