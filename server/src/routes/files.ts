import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import { FileService } from '../services/file-service'
import { BrowseRequest } from '../../../shared/src/types'

const router = Router()
const fileService = new FileService()

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
    
    // Upewnij się że katalog docelowy istnieje
    await fs.ensureDir(targetDir)
    
    const uploadedFiles = []
    
    // Przenieś każdy plik z temp do docelowej lokalizacji
    for (const file of files) {
      const targetPath = path.join(targetDir, file.originalname)
      await fs.move(file.path, targetPath, { overwrite: true })
      
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

export default router
