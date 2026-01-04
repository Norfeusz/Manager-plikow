import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import { FileService } from '../services/file-service'
import { ExifService } from '../services/exif-service'
import { GoogleDriveService } from '../services/google-drive/google-drive-service'
import { tokenStore } from './auth'
import { isImageFile, isVideoFile, isVideoCompanionFile, getBasenameWithoutExt } from '../utils/file-helpers'

const router = Router()
const fileService = new FileService()
const exifService = new ExifService()

// Funkcja sprawdzająca czy ścieżka to Google Drive
function isGoogleDrivePath(filePath: string): boolean {
  return filePath.startsWith('gdrive:')
}

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
router.get('/drives', async (_req: Request, res: Response) => {
  try {
    const drives = []
    
    // Windows - sprawdź dyski od A do Z
    if (os.platform() === 'win32') {
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i)
        const drivePath = `${letter}:\\`
        
        try {
          await fs.access(drivePath)
          await fs.stat(drivePath)
          
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
    let { sourcePath, targetBaseDir, operation = 'move', customFolder, assignToYear = true } = req.body
    
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
    
    // Pobierz tokeny Google Drive jeśli są dostępne
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    // Wykryj czy to Google Drive (fileId bez prefiksu gdrive:)
    // FileId z Google Drive ma długość ~30-40 znaków i nie zawiera \ ani /
    const isGoogleDriveFileId = !sourcePath.includes('\\') && !sourcePath.includes('/') && 
                                 !sourcePath.includes(':') && sourcePath.length > 20
    
    if (isGoogleDriveFileId && !sourcePath.startsWith('gdrive:')) {
      sourcePath = `gdrive:${sourcePath}`
    }
    
    // Sprawdź czy to plik czy folder (tylko dla lokalnych plików)
    const isGoogleDrive = isGoogleDrivePath(sourcePath)
    let stats: any
    
    if (!isGoogleDrive) {
      stats = await fs.stat(sourcePath)
    }
    const filesToProcess: string[] = []
    const sourceDirs = new Set<string>() // Zbiór folderów źródłowych do sprawdzenia
    
    if (!isGoogleDrive && stats && stats.isDirectory()) {
      // Zbierz wszystkie zdjęcia z folderu (tylko lokalne pliki)
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
      // Pojedynczy plik (lokalny lub Google Drive)
      // Dla Google Drive sprawdź czy to nie folder
      if (isGoogleDrive && tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const fileId = sourcePath.replace('gdrive:', '')
          const metadata = await driveService.getFileMetadata(fileId)
          
          // Sprawdź czy to folder (mimeType dla folderów to 'application/vnd.google-apps.folder')
          if (metadata.mimeType === 'application/vnd.google-apps.folder') {
            return res.status(400).json({ 
              error: 'Nie można organizować folderów. Proszę zaznaczyć pliki.' 
            })
          }
        } catch (error) {
          console.error('Błąd sprawdzania typu pliku Google Drive:', error)
        }
      }
      
      filesToProcess.push(sourcePath)
      if (!isGoogleDrive) {
        sourceDirs.add(path.dirname(sourcePath))
      }
    }
    
    const results = {
      processed: 0,
      moved: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    // Zbiór przetworzonych plików towarzyszących (aby nie przetwarzać ich osobno)
    const processedCompanions = new Set<string>()
    
    for (const filePath of filesToProcess) {
      // Pomiń pliki towarzyszące - zostaną przetworzone razem z głównym plikiem
      if (!isGoogleDrivePath(filePath) && isVideoCompanionFile(path.basename(filePath))) {
        // Pliki towarzyszące pomijamy zawsze - będą przetworzone z głównym plikiem video
        console.log(`Pomijam plik towarzyszący: ${path.basename(filePath)}`)
        continue
      }
      
      results.processed++
      
      try {
        // Rozpoznaj typ pliku
        const fileName = isGoogleDrivePath(filePath) 
          ? (await (async () => {
              if (tokens) {
                const driveService = new GoogleDriveService()
                driveService.setCredentials(tokens)
                const metadata = await driveService.getFileMetadata(filePath.replace('gdrive:', ''))
                return metadata.name || path.basename(filePath)
              }
              return path.basename(filePath)
            })())
          : path.basename(filePath)
        
        const isImage = isImageFile(fileName)
        const isVideo = isVideoFile(fileName)
        
        if (!isImage && !isVideo) {
          results.skipped++
          results.errors.push(`${fileName}: Nieobsługiwany typ pliku`)
          continue
        }
        
        // Wybierz odpowiednią metodę generowania ścieżki
        let newPath: string | null
        let actualTargetBaseDir = targetBaseDir
        
        // Struktura folderów:
        // - Tryb standardowy (bez customFolder):
        //   - Zdjęcia → targetBaseDir/YYYY/MM/ (targetBaseDir już zawiera "Zdjecia")
        //   - Video → targetBaseDir/Filmy/YYYY/MM/
        // - Tryb niestandardowy (z customFolder):
        //   - Zdjęcia → targetBaseDir/[YYYY/]nazwa_folderu/
        //   - Video → targetBaseDir/Filmy/[YYYY/]nazwa_folderu/
        if (!customFolder) {
          // Tryb standardowy
          actualTargetBaseDir = isImage 
            ? targetBaseDir  // Zdjęcia: użyj targetBaseDir bez zmian
            : path.join(targetBaseDir, 'Filmy')  // Video: dodaj podkatalog Filmy
        } else {
          // Tryb niestandardowy
          actualTargetBaseDir = isImage 
            ? targetBaseDir  // Zdjęcia: użyj targetBaseDir bez zmian
            : path.join(targetBaseDir, 'Filmy')  // Video: dodaj podkatalog Filmy
        }
        
        if (isImage) {
          newPath = await exifService.generateFullPhotoPath(filePath, actualTargetBaseDir, customFolder, assignToYear, tokens)
        } else {
          newPath = await exifService.generateFullVideoPath(filePath, actualTargetBaseDir, customFolder, assignToYear, tokens)
        }
        
        if (!newPath) {
          results.skipped++
          if (!customFolder) {
            results.errors.push(`${fileName}: Brak metadanych. Użyj niestandardowego folderu z opcją "Nie przypisuj do roku"`)
          } else {
            results.errors.push(`${fileName}: Brak metadanych`)
          }
          continue
        }
        
        // Utwórz folder docelowy
        await fs.ensureDir(path.dirname(newPath))
        
        // Obsługa duplikatów i sufik sów
        let finalPath = newPath
        let suffix = ''
        
        if (!isGoogleDrivePath(filePath) && await fs.pathExists(newPath)) {
          const sourceStats = await fs.stat(filePath)
          const targetStats = await fs.stat(newPath)
          
          if (sourceStats.size === targetStats.size) {
            console.log(`Duplikat: ${fileName} (${sourceStats.size} bajtów)`)
            results.errors.push(`${fileName}: Duplikat (taki sam plik już istnieje)`)
            results.skipped++
            
            if (operation === 'move') {
              await fs.remove(filePath)
            }
            continue
          }
          
          // Dodaj sufiks
          const ext = path.extname(newPath)
          const nameWithoutExt = newPath.slice(0, -ext.length)
          let counter = 1
          
          while (await fs.pathExists(`${nameWithoutExt}_${counter}${ext}`)) {
            counter++
          }
          
          suffix = `_${counter}`
          finalPath = `${nameWithoutExt}${suffix}${ext}`
        }
        
        // Dla filmów: znajdź i przenieś pliki towarzyszące (tylko lokalne pliki)
        const companionFiles: Array<{source: string, target: string}> = []
        
        if (isVideo && !isGoogleDrivePath(filePath)) {
          const sourceDir = path.dirname(filePath)
          const baseName = getBasenameWithoutExt(path.basename(filePath))
          // Wyciągnij cyfry z nazwy pliku (np. GX010270 → 010270)
          const baseDigits = baseName.match(/\d+/)?.[0] || ''
          
          try {
            const dirFiles = await fs.readdir(sourceDir)
            
            for (const dirFile of dirFiles) {
              const dirFilePath = path.join(sourceDir, dirFile)
              const dirFileBase = getBasenameWithoutExt(dirFile)
              const dirFileDigits = dirFileBase.match(/\d+/)?.[0] || ''
              
              // Sprawdź czy to plik towarzyszący (te same cyfry w nazwie, rozszerzenie .lrv lub .thm)
              if (dirFileDigits && baseDigits && 
                  dirFileDigits === baseDigits && 
                  isVideoCompanionFile(dirFile)) {
                
                // Wygeneruj ścieżkę dla pliku towarzyszącego (ta sama nazwa co główny plik)
                const companionExt = path.extname(dirFile)
                const companionTargetPath = finalPath.slice(0, -path.extname(finalPath).length) + companionExt
                
                companionFiles.push({
                  source: dirFilePath,
                  target: companionTargetPath
                })
                
                processedCompanions.add(dirFilePath)
              }
            }
          } catch (err) {
            console.log(`Nie można przeszukać katalogu w poszukiwaniu plików towarzyszących: ${sourceDir}`)
          }
        }
        
        // Sprawdź czy istnieje plik towarzyszący bez głównego video
        if (isVideo && !isGoogleDrivePath(filePath) && companionFiles.length > 0) {
          for (const companion of companionFiles) {
            if (await fs.pathExists(companion.target)) {
              // Plik towarzyszący już istnieje - sprawdź czy główny plik też istnieje
              if (!await fs.pathExists(finalPath)) {
                // Głównego nie ma, a towarzyszący jest - dodaj sufiks do nowego pliku
                const ext = path.extname(finalPath)
                const nameWithoutExt = finalPath.slice(0, -ext.length)
                let counter = 1
                
                while (await fs.pathExists(`${nameWithoutExt}_${counter}${ext}`)) {
                  counter++
                }
                
                suffix = `_${counter}`
                const oldFinalPath = finalPath
                finalPath = `${nameWithoutExt}${suffix}${ext}`
                
                // Zaktualizuj ścieżki plików towarzyszących
                for (const comp of companionFiles) {
                  const compExt = path.extname(comp.target)
                  const compNameWithoutExt = comp.target.slice(0, -compExt.length)
                  comp.target = `${compNameWithoutExt.replace(oldFinalPath.slice(0, -ext.length), finalPath.slice(0, -ext.length))}${compExt}`
                }
              }
            }
          }
        }
        
        // Przenieś lub kopiuj główny plik
        if (isGoogleDrivePath(filePath)) {
          const fileId = filePath.replace('gdrive:', '')
          
          if (!tokens) {
            results.errors.push(`${fileName}: Brak autoryzacji Google Drive`)
            continue
          }
          
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          
          await driveService.downloadFile(fileId, finalPath)
          
          if (operation === 'move') {
            await driveService.deleteFile(fileId)
          }
        } else {
          if (operation === 'move') {
            await fs.move(filePath, finalPath, { overwrite: false })
          } else {
            await fs.copy(filePath, finalPath, { overwrite: false })
          }
        }
        
        // Przenieś pliki towarzyszące
        for (const companion of companionFiles) {
          try {
            if (operation === 'move') {
              await fs.move(companion.source, companion.target, { overwrite: false })
            } else {
              await fs.copy(companion.source, companion.target, { overwrite: false })
            }
            console.log(`Przeniesiono plik towarzyszący: ${path.basename(companion.source)} → ${path.basename(companion.target)}`)
          } catch (err: any) {
            console.error(`Błąd przenoszenia pliku towarzyszącego ${path.basename(companion.source)}:`, err.message)
          }
        }
        
        results.moved++
        
      } catch (error: any) {
        const fileName = path.basename(filePath)
        results.errors.push(`${fileName}: ${error.message}`)
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
    let { sourcePath, targetFolder } = req.body
    
    if (!sourcePath || !targetFolder) {
      return res.status(400).json({ 
        error: 'Brak wymaganych parametrów: sourcePath, targetFolder' 
      })
    }
    
    // Pobierz tokeny Google Drive jeśli są dostępne
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    // Wykryj czy to Google Drive (fileId bez prefiksu gdrive:)
    const isGoogleDriveFileId = !sourcePath.includes('\\') && !sourcePath.includes('/') && 
                                 !sourcePath.includes(':') && sourcePath.length > 20
    
    if (isGoogleDriveFileId && !sourcePath.startsWith('gdrive:')) {
      sourcePath = `gdrive:${sourcePath}`
    }
    
    // Sprawdź czy to plik czy folder (tylko dla lokalnych plików)
    const isGoogleDrive = isGoogleDrivePath(sourcePath)
    let stats: any
    
    if (!isGoogleDrive) {
      stats = await fs.stat(sourcePath)
    }
    
    const filesToProcess: string[] = []
    const sourceDirs = new Set<string>()
    
    if (!isGoogleDrive && stats && stats.isDirectory()) {
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
      // Dla Google Drive sprawdź czy to nie folder
      if (isGoogleDrive && tokens) {
        try {
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          const fileId = sourcePath.replace('gdrive:', '')
          const metadata = await driveService.getFileMetadata(fileId)
          
          // Sprawdź czy to folder
          if (metadata.mimeType === 'application/vnd.google-apps.folder') {
            return res.status(400).json({ 
              error: 'Nie można organizować folderów. Proszę zaznaczyć pliki.' 
            })
          }
        } catch (error) {
          console.error('Błąd sprawdzania typu pliku Google Drive:', error)
        }
      }
      
      filesToProcess.push(sourcePath)
      if (!isGoogleDrive) {
        sourceDirs.add(path.dirname(sourcePath))
      }
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
        const newName = await exifService.generatePhotoName(filePath, true, tokens)
        
        if (!newName) {
          results.errors.push(`${path.basename(filePath)}: Błąd generowania nazwy`)
          results.skipped++
          continue
        }
        
        let targetPath = path.join(targetFolder, newName)
        
        // Sprawdź czy plik już istnieje w folderze docelowym (tylko dla lokalnych plików)
        if (!isGoogleDrivePath(filePath) && await fs.pathExists(targetPath)) {
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
        if (isGoogleDrivePath(filePath)) {
          // Google Drive → lokalny dysk: pobierz i usuń z Google Drive
          const fileId = filePath.replace('gdrive:', '')
          
          if (!tokens) {
            results.errors.push(`${path.basename(filePath)}: Brak autoryzacji Google Drive`)
            continue
          }
          
          const driveService = new GoogleDriveService()
          driveService.setCredentials(tokens)
          
          await driveService.downloadFile(fileId, targetPath)
          await driveService.deleteFile(fileId)
        } else {
          // Lokalny plik → lokalny dysk: użyj fs
          await fs.move(filePath, targetPath, { overwrite: false })
        }
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
