import fs from 'fs-extra'
import path from 'path'
import { FileMetadata, BrowseResponse } from '../../../shared/src/types'
import { getFileType } from '../utils/file-helpers'

export class FileService {
  async uploadFile(sourcePath: string, targetDir: string, filename: string): Promise<FileMetadata> {
    const targetPath = path.join(targetDir, filename)
    
    // Sprawdź czy katalog docelowy istnieje
    await fs.ensureDir(targetDir)
    
    // Skopiuj plik
    await fs.copy(sourcePath, targetPath)
    
    // Pobierz metadata
    const stats = await fs.stat(targetPath)
    
    return {
      name: filename,
      path: targetPath,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      isDirectory: false,
      type: getFileType(filename, false)
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const sourceExists = await fs.pathExists(sourcePath)
    if (!sourceExists) {
      throw new Error(`Plik źródłowy nie istnieje: ${sourcePath}`)
    }
    
    // Upewnij się że katalog docelowy istnieje
    const targetDir = path.dirname(targetPath)
    await fs.ensureDir(targetDir)
    
    // Przenieś plik
    await fs.move(sourcePath, targetPath, { overwrite: false })
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    const sourceExists = await fs.pathExists(sourcePath)
    if (!sourceExists) {
      throw new Error(`Plik źródłowy nie istnieje: ${sourcePath}`)
    }
    
    // Upewnij się że katalog docelowy istnieje
    const targetDir = path.dirname(targetPath)
    await fs.ensureDir(targetDir)
    
    // Skopiuj plik
    await fs.copy(sourcePath, targetPath, { overwrite: false })
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath)
  }

  async deleteFile(filePath: string): Promise<void> {
    const exists = await fs.pathExists(filePath)
    if (!exists) {
      throw new Error(`Plik nie istnieje: ${filePath}`)
    }
    
    await fs.remove(filePath)
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const exists = await fs.pathExists(oldPath)
    if (!exists) {
      throw new Error(`Plik nie istnieje: ${oldPath}`)
    }
    
    await fs.rename(oldPath, newPath)
  }
  async browseDirectory(dirPath: string): Promise<BrowseResponse> {
    try {
      // Sprawdzenie czy ścieżka istnieje
      const exists = await fs.pathExists(dirPath)
      if (!exists) {
        throw new Error(`Ścieżka nie istnieje: ${dirPath}`)
      }

      // Sprawdzenie czy to katalog
      const stats = await fs.stat(dirPath)
      if (!stats.isDirectory()) {
        throw new Error(`Ścieżka nie jest katalogiem: ${dirPath}`)
      }

      // Odczyt zawartości katalogu
      const entries = await fs.readdir(dirPath)
      
      // Mapowanie plików do metadata
      const items: FileMetadata[] = []
      
      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry)
          const itemStats = await fs.stat(fullPath)
          
          const metadata: FileMetadata = {
            name: entry,
            path: fullPath,
            size: itemStats.size,
            createdAt: itemStats.birthtime.toISOString(),
            modifiedAt: itemStats.mtime.toISOString(),
            isDirectory: itemStats.isDirectory(),
            type: getFileType(entry, itemStats.isDirectory())
          }
          
          items.push(metadata)
        } catch (error) {
          // Pomijamy pliki do których nie mamy dostępu
          console.warn(`Nie można odczytać: ${entry}`, error)
        }
      }
      
      // Sortowanie: najpierw foldery, potem pliki, alfabetycznie
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
      
      // Wyznaczenie ścieżki nadrzędnej
      const parentPath = path.dirname(dirPath)
      const isRoot = dirPath === parentPath
      
      return {
        currentPath: dirPath,
        parentPath: isRoot ? null : parentPath,
        items
      }
    } catch (error) {
      throw error
    }
  }
}
