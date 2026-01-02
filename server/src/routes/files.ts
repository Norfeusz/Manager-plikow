import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import { FileService } from '../services/file-service'
import { ExifService } from '../services/exif-service'
import { BrowseRequest } from '../../../shared/src/types'

const router = Router()
const fileService = new FileService()
const exifService = new ExifService()

// Funkcja pomocnicza do usuwania pustych folderów
async function removeEmptyDirectories(dirPath: string): Promise<void> {
  try {
    const items = await fs.readdir(dirPath)
    
    // Jeśli folder jest pusty, usuń go
    if (items.length === 0) {
      await fs.rmdir(dirPath)
      console.log(`Usunięto pusty folder: ${dirPath}`)
      
      // Rekurencyjnie sprawdź folder nadrzędny
      const parentDir = path.dirname(dirPath)
      // Nie usuwaj głównych dysków (np. D:\)
      if (parentDir !== dirPath && !parentDir.match(/^[A-Z]:\\$/i)) {
        await removeEmptyDirectories(parentDir)
      }
    }
  } catch (error) {
    // Ignoruj błędy (folder może nie istnieć lub być niedostępny)
  }
}

// Konfiguracja multer dla uploadu - najpierw do temp, potem przenosimy
const upload = multer({ 
  dest: 'uploads/temp',
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB max
  }
})

// GET /api/files/drives - lista dostępnych dysków
router.get('/drives', async (req: Request, res: Response) => {
  try {
    const drives = []
    
    // Windows - sprawdź dyski od A do Z
    if (os.platform() === 'win32') {
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i)
        const drivePath = `${letter}:\\`
        
        try {
          await fs.access(drivePath)
          const stats = await fs.stat(drivePath)
          
          drives.push({
            letter,
            path: drivePath,
            name: `Dysk ${letter}:`
          })
        } catch {
          // Dysk niedostępny
        }
      }
    }
    
    res.json({ drives })
  } catch (error: any) {
    console.error('Błąd pobierania dysków:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas pobierania dysków' })
  }
})

// GET /api/files/browse?path=<ścieżka>
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { path } = req.query
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ 
        error: 'Brak wymaganego parametru: path' 
      })
    }
    
    const result = await fileService.browseDirectory(path)
    res.json(result)
  } catch (error: any) {
    console.error('Błąd przeglądania katalogu:', error)
    res.status(500).json({ 
      error: error.message || 'Błąd podczas przeglądania katalogu' 
    })
  }
})

// POST /api/files/upload
router.post('/upload', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    const targetDir = req.body.targetDir
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Brak plików do uploadu' })
    }
    
    if (!targetDir) {
      return res.status(400).json({ error: 'Brak katalogu docelowego' })
    }
    
    // Sprawdź czy targetDir nie jest dyskiem (np. F:\)
    if (targetDir.match(/^[A-Z]:\\$/i)) {
      return res.status(400).json({ 
        error: 'Nie można uploadować bezpośrednio do głównego katalogu dysku. Wybierz folder na dysku.' 
      })
    }
    
    // Upewnij się że katalog docelowy istnieje
    await fs.ensureDir(targetDir)
    
    // Odczytaj oryginalne daty plików
    let fileDates: any = {}
    if (req.body.fileDates) {
      try {
        const dates = JSON.parse(req.body.fileDates)
        fileDates = Object.fromEntries(dates.map((d: any) => [d.name, d.lastModified]))
      } catch (e) {
        console.error('Błąd parsowania dat plików:', e)
      }
    }
    
    const uploadedFiles = []
    
    // Przenieś każdy plik z temp do docelowej lokalizacji
    for (const file of files) {
      const targetPath = path.join(targetDir, file.originalname)
      await fs.move(file.path, targetPath, { overwrite: true })
      
      // Przywróć oryginalną datę modyfikacji jeśli dostępna
      if (fileDates[file.originalname]) {
        const originalDate = new Date(fileDates[file.originalname])
        try {
          await fs.utimes(targetPath, originalDate, originalDate)
          console.log(`Przywrócono datę dla ${file.originalname}: ${originalDate.toISOString()}`)
        } catch (error) {
          console.error(`Nie można ustawić daty dla ${file.originalname}:`, error)
        }
      }
      
      uploadedFiles.push({
        name: file.originalname,
        path: targetPath,
        size: file.size
      })
    }
    
    res.json({ 
      success: true, 
      files: uploadedFiles,
      count: uploadedFiles.length 
    })
  } catch (error: any) {
    console.error('Błąd uploadu:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas uploadu' })
  }
})

// POST /api/files/move
router.post('/move', async (req: Request, res: Response) => {
  try {
    const { sourcePath, targetPath } = req.body
    
    if (!sourcePath || !targetPath) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: sourcePath, targetPath' 
      })
    }
    
    await fileService.moveFile(sourcePath, targetPath)
    res.json({ success: true, message: 'Plik przeniesiony' })
  } catch (error: any) {
    console.error('Błąd przenoszenia:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas przenoszenia' })
  }
})

// POST /api/files/copy
router.post('/copy', async (req: Request, res: Response) => {
  try {
    const { sourcePath, targetPath } = req.body
    
    if (!sourcePath || !targetPath) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: sourcePath, targetPath' 
      })
    }
    
    await fileService.copyFile(sourcePath, targetPath)
    res.json({ success: true, message: 'Plik skopiowany' })
  } catch (error: any) {
    console.error('Błąd kopiowania:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas kopiowania' })
  }
})

// POST /api/files/create-directory
router.post('/create-directory', async (req: Request, res: Response) => {
  try {
    const { dirPath } = req.body
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Brak wymaganego parametru: dirPath' })
    }
    
    await fileService.createDirectory(dirPath)
    res.json({ success: true, message: 'Katalog utworzony', path: dirPath })
  } catch (error: any) {
    console.error('Błąd tworzenia katalogu:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas tworzenia katalogu' })
  }
})

// DELETE /api/files/delete
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body
    
    if (!filePath) {
      return res.status(400).json({ error: 'Brak wymaganego parametru: filePath' })
    }
    
    await fileService.deleteFile(filePath)
    res.json({ success: true, message: 'Plik usunięty' })
  } catch (error: any) {
    console.error('Błąd usuwania:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas usuwania' })
  }
})

// POST /api/files/rename
router.post('/rename', async (req: Request, res: Response) => {
  try {
    const { oldPath, newPath } = req.body
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: oldPath, newPath' 
      })
    }
    
    await fileService.renameFile(oldPath, newPath)
    res.json({ success: true, message: 'Plik zmieniono nazwę' })
  } catch (error: any) {
    console.error('Błąd zmiany nazwy:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas zmiany nazwy' })
  }
})

// GET /api/files/exif?path=<ścieżka>
router.get('/exif', async (req: Request, res: Response) => {
  try {
    const { path } = req.query
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ 
        error: 'Brak wymaganego parametru: path' 
      })
    }
    
    const exifData = await exifService.readExif(path)
    
    if (!exifData) {
      return res.status(404).json({ 
        error: 'Brak danych EXIF lub plik nie jest zdjęciem' 
      })
    }
    
    res.json(exifData)
  } catch (error: any) {
    console.error('Błąd odczytu EXIF:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas odczytu EXIF' })
  }
})

// POST /api/files/organize-photos
router.post('/organize-photos', async (req: Request, res: Response) => {
  try {
    const { sourcePath, targetBaseDir, operation = 'move', customFolder, assignToYear = true } = req.body
    
    if (!sourcePath || !targetBaseDir) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: sourcePath, targetBaseDir' 
      })
    }
    
    if (operation !== 'move' && operation !== 'copy') {
      return res.status(400).json({ 
        error: 'Nieprawidłowa operacja. Dozwolone: move, copy' 
      })
    }
    
    // Sprawdź czy to plik czy folder
    const stats = await fs.stat(sourcePath)
    const filesToProcess: string[] = []
    const sourceDirs = new Set<string>() // Zbiór folderów źródłowych do sprawdzenia
    
    if (stats.isDirectory()) {
      // Zbierz wszystkie zdjęcia z folderu
      const files = await fs.readdir(sourcePath)
      for (const file of files) {
        const fullPath = path.join(sourcePath, file)
        const fileStats = await fs.stat(fullPath)
        if (fileStats.isFile()) {
          filesToProcess.push(fullPath)
          sourceDirs.add(path.dirname(fullPath))
        }
      }
    } else {
      filesToProcess.push(sourcePath)
      sourceDirs.add(path.dirname(sourcePath))
    }
    
    const results = {
      processed: 0,
      moved: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    for (const filePath of filesToProcess) {
      results.processed++
      
      try {
        let newPath = await exifService.generateFullPhotoPath(filePath, targetBaseDir, customFolder, assignToYear)
        
        if (!newPath) {
          results.skipped++
          if (!customFolder) {
            // Tryb standardowy bez daty - sugeruj użycie niestandardowego folderu
            results.errors.push(`${path.basename(filePath)}: Brak danych EXIF. Użyj niestandardowego folderu z opcją "Nie przypisuj do roku" lub dodaj do folderu "Brak daty"`)
          } else {
            results.errors.push(`${path.basename(filePath)}: Brak danych EXIF`)
          }
          continue
        }
        
        // Utwórz folder docelowy
        await fs.ensureDir(path.dirname(newPath))
        
        // Sprawdź czy plik już istnieje w folderze docelowym
        if (await fs.pathExists(newPath)) {
          // Plik o tej nazwie już istnieje - sprawdź rozmiar
          const sourceStats = await fs.stat(filePath)
          const targetStats = await fs.stat(newPath)
          
          if (sourceStats.size === targetStats.size) {
            // To jest duplikat (taka sama nazwa i rozmiar) - pomiń
            console.log(`Duplikat: ${path.basename(filePath)} (${sourceStats.size} bajtów)`)
            results.errors.push(`${path.basename(filePath)}: Duplikat (taki sam plik już istnieje)`)
            results.skipped++
            
            // Jeśli to operacja move, usuń źródłowy plik (bo to duplikat)
            if (operation === 'move') {
              await fs.remove(filePath)
            }
            continue
          }
          
          // Rozmiar inny - dodaj sufiks (_1, _2, itd.)
          const ext = path.extname(newPath)
          const nameWithoutExt = newPath.slice(0, -ext.length)
          let counter = 1
          let newPathWithSuffix = `${nameWithoutExt}_${counter}${ext}`
          
          while (await fs.pathExists(newPathWithSuffix)) {
            counter++
            newPathWithSuffix = `${nameWithoutExt}_${counter}${ext}`
          }
          
          newPath = newPathWithSuffix
        }
        
        // Przenieś lub kopiuj plik
        if (operation === 'move') {
          await fs.move(filePath, newPath, { overwrite: false })
        } else {
          await fs.copy(filePath, newPath, { overwrite: false })
        }
        results.moved++
        
      } catch (error: any) {
        results.errors.push(`${path.basename(filePath)}: ${error.message}`)
      }
    }
    
    // Jeśli operacja to move, usuń puste foldery źródłowe
    if (operation === 'move') {
      for (const dir of sourceDirs) {
        await removeEmptyDirectories(dir)
      }
    }
    
    res.json(results)
  } catch (error: any) {
    console.error('Błąd organizowania zdjęć:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas organizowania zdjęć' })
  }
})

// POST /api/files/simple-move-photos - proste przeniesienie zdjęć z dodaniem daty do nazwy
router.post('/simple-move-photos', async (req: Request, res: Response) => {
  try {
    const { sourcePath, targetFolder } = req.body
    
    if (!sourcePath || !targetFolder) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: sourcePath, targetFolder' 
      })
    }
    
    // Sprawdź czy to plik czy folder
    const stats = await fs.stat(sourcePath)
    const filesToProcess: string[] = []
    const sourceDirs = new Set<string>()
    
    if (stats.isDirectory()) {
      const files = await fs.readdir(sourcePath)
      for (const file of files) {
        const fullPath = path.join(sourcePath, file)
        const fileStats = await fs.stat(fullPath)
        if (fileStats.isFile()) {
          filesToProcess.push(fullPath)
          sourceDirs.add(path.dirname(fullPath))
        }
      }
    } else {
      filesToProcess.push(sourcePath)
      sourceDirs.add(path.dirname(sourcePath))
    }
    
    const results = {
      processed: 0,
      moved: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    // Upewnij się że folder docelowy istnieje
    await fs.ensureDir(targetFolder)
    
    for (const filePath of filesToProcess) {
      results.processed++
      
      try {
        // Spróbuj wygenerować nazwę z datą
        const newName = await exifService.generatePhotoName(filePath, true)
        
        if (!newName) {
          results.errors.push(`${path.basename(filePath)}: Błąd generowania nazwy`)
          results.skipped++
          continue
        }
        
        let targetPath = path.join(targetFolder, newName)
        
        // Sprawdź czy plik już istnieje w folderze docelowym
        if (await fs.pathExists(targetPath)) {
          // Plik o tej nazwie już istnieje - sprawdź rozmiar
          const sourceStats = await fs.stat(filePath)
          const targetStats = await fs.stat(targetPath)
          
          if (sourceStats.size === targetStats.size) {
            // To jest duplikat (taka sama nazwa i rozmiar) - pomiń i usuń źródło
            console.log(`Duplikat: ${path.basename(filePath)} (${sourceStats.size} bajtów)`)
            results.errors.push(`${path.basename(filePath)}: Duplikat (taki sam plik już istnieje)`)
            results.skipped++
            await fs.remove(filePath)
            continue
          }
          
          // Rozmiar inny - dodaj sufiks (_1, _2, itd.)
          const ext = path.extname(targetPath)
          const nameWithoutExt = targetPath.slice(0, -ext.length)
          let counter = 1
          let targetPathWithSuffix = `${nameWithoutExt}_${counter}${ext}`
          
          while (await fs.pathExists(targetPathWithSuffix)) {
            counter++
            targetPathWithSuffix = `${nameWithoutExt}_${counter}${ext}`
          }
          
          targetPath = targetPathWithSuffix
        }
        
        // Przenieś plik
        await fs.move(filePath, targetPath, { overwrite: false })
        results.moved++
        
      } catch (error: any) {
        results.errors.push(`${path.basename(filePath)}: ${error.message}`)
      }
    }
    
    // Usuń puste foldery źródłowe
    for (const dir of sourceDirs) {
      await removeEmptyDirectories(dir)
    }
    
    res.json(results)
  } catch (error: any) {
    console.error('Błąd przenoszenia zdjęć:', error)
    res.status(500).json({ error: error.message || 'Błąd podczas przenoszenia zdjęć' })
  }
})

export default router
