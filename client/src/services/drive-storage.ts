import { DriveConfig } from '../../../../shared/src/types'

const STORAGE_KEY = 'manager-plikow-drives'

const DEFAULT_DRIVES: DriveConfig[] = [
  {
    id: 'main',
    name: 'Dysk główny (D)',
    defaultPath: 'D:\\DATA',
    needsConfiguration: false
  },
  {
    id: 'sony',
    name: 'Dysk Sony (zdjęcia)',
    needsConfiguration: true
  },
  {
    id: 'toshiba',
    name: 'Dysk Toshiba (archiwum)',
    needsConfiguration: true
  },
  {
    id: 'norfeusz',
    name: 'Dysk Norfeusz (Google)',
    defaultPath: 'G:\\Mój dysk',
    needsConfiguration: false
  },
  {
    id: 'norbert',
    name: 'Dysk Norbert S. (Google)',
    defaultPath: 'H:\\Mój dysk',
    needsConfiguration: false
  }
]

export const driveStorage = {
  getDrives(): DriveConfig[] {
    const stored = localStorage.getItem(STORAGE_KEY)
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
