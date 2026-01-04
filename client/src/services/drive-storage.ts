import { DriveConfig } from '../../../../shared/src/types'

const STORAGE_KEY = 'manager-plikow-drives'
const STORAGE_VERSION_KEY = 'manager-plikow-drives-version'
const CURRENT_VERSION = '4' // Zwiększ wersję gdy zmieniasz DEFAULT_DRIVES

const DEFAULT_DRIVES: DriveConfig[] = [
  {
    id: 'local',
    name: 'Dysk C (lokalny)',
    defaultPath: 'C:\\',
    needsConfiguration: false
  },
  {
    id: 'main',
    name: 'Dysk główny (D)',
    defaultPath: 'D:\\DATA',
    needsConfiguration: false
  },
  {
    id: 'samsung',
    name: 'Dysk Samsung (zdjęcia)',
    needsConfiguration: true
  },
  {
    id: 'toshiba',
    name: 'Dysk Toshiba (archiwum)',
    needsConfiguration: true
  },
  {
    id: 'norbert',
    name: 'Norbert S. (Google Drive)',
    isGoogleDrive: true,
    needsConfiguration: false
  }
]

export const driveStorage = {
  getDrives(): DriveConfig[] {
    // Sprawdź wersję konfiguracji
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
    const stored = localStorage.getItem(STORAGE_KEY)
    
    // Jeśli wersja się nie zgadza, zrób merge zapisanych z domyślnymi
    if (storedVersion !== CURRENT_VERSION) {
      let existingDrives: DriveConfig[] = []
      
      if (stored) {
        try {
          existingDrives = JSON.parse(stored)
        } catch (e) {
          existingDrives = []
        }
      }
      
      // Merguj: zachowaj customPath ze starych, dodaj nowe, usuń nieistniejące
      const mergedDrives = DEFAULT_DRIVES.map(defaultDrive => {
        const existing = existingDrives.find(d => d.id === defaultDrive.id)
        if (existing && existing.customPath) {
          return { ...defaultDrive, customPath: existing.customPath }
        }
        return defaultDrive
      })
      
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedDrives))
      return mergedDrives
    }
    
    if (stored) {
      return JSON.parse(stored)
    }
    return DEFAULT_DRIVES
  },

  saveDrives(drives: DriveConfig[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drives))
  },

  updateDrivePath(driveId: string, path: string): void {
    const drives = this.getDrives()
    const drive = drives.find(d => d.id === driveId)
    if (drive) {
      drive.customPath = path
      this.saveDrives(drives)
    }
  },

  getDrivePath(driveId: string): string | null {
    const drives = this.getDrives()
    const drive = drives.find(d => d.id === driveId)
    if (!drive) return null
    return drive.customPath || drive.defaultPath || null
  }
}
