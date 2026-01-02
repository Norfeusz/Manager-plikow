import { Router, Request, Response } from 'express'
import { GoogleDriveService } from '../services/google-drive/google-drive-service'
import { tokenStore } from './auth'
import { FileMetadata } from '../../../shared/src/types'

const router = Router()

// Helper do konwersji pliku Google Drive na FileMetadata
function convertGDriveToFileMetadata(file: any): FileMetadata {
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder'
  const isImage = file.mimeType?.startsWith('image/')
  const isVideo = file.mimeType?.startsWith('video/')
  
  return {
    name: file.name,
    path: file.id, // W Google Drive używamy ID jako ścieżki
    size: parseInt(file.size || '0'),
    createdAt: file.createdTime,
    modifiedAt: file.modifiedTime,
    isDirectory: isFolder,
    type: isFolder ? 'directory' : isImage ? 'image' : isVideo ? 'video' : 'other'
  }
}

// GET /api/google-drive/browse?folderId=<id>
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { folderId } = req.query
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    const files = await driveService.listFiles(folderId as string || 'root')
    const items = files.map(convertGDriveToFileMetadata)
    
    res.json({
      currentPath: folderId || 'root',
      parentPath: null, // TODO: można dodać logikę dla parentPath
      items
    })
  } catch (error: any) {
    console.error('Błąd przeglądania Google Drive:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/google-drive/create-folder
router.post('/create-folder', async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    const folder = await driveService.createFolder(name, parentId || 'root')
    
    res.json({ success: true, folder })
  } catch (error: any) {
    console.error('Błąd tworzenia folderu:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/google-drive/upload
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { fileName, filePath, parentId } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    const file = await driveService.uploadFile(fileName, filePath, parentId || 'root')
    
    res.json({ success: true, file })
  } catch (error: any) {
    console.error('Błąd uploadu:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/google-drive/move
router.post('/move', async (req: Request, res: Response) => {
  try {
    const { fileId, newParentId } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    await driveService.moveFile(fileId, newParentId)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd przenoszenia:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/google-drive/copy
router.post('/copy', async (req: Request, res: Response) => {
  try {
    const { fileId, newParentId, newName } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    await driveService.copyFile(fileId, newParentId, newName)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd kopiowania:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/google-drive/delete
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    await driveService.deleteFile(fileId)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd usuwania:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/google-drive/rename
router.post('/rename', async (req: Request, res: Response) => {
  try {
    const { fileId, newName } = req.body
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    if (!tokens) {
      return res.status(401).json({ error: 'Brak autoryzacji Google Drive' })
    }
    
    const driveService = new GoogleDriveService()
    driveService.setCredentials(tokens)
    
    await driveService.renameFile(fileId, newName)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd zmiany nazwy:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
