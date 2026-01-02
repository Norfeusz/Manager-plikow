import { BrowseResponse } from '../../../shared/src/types'

const API_BASE = '/api'

export const fileApi = {
  async getDrives(): Promise<any> {
    const response = await fetch(`${API_BASE}/files/drives`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas pobierania dysków')
    }
    
    return response.json()
  },

  async browseDirectory(path: string): Promise<BrowseResponse> {
    const response = await fetch(`${API_BASE}/files/browse?path=${encodeURIComponent(path)}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas przeglądania katalogu')
    }
    
    return response.json()
  },

  async uploadFiles(files: File[], targetDir: string): Promise<any> {
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('targetDir', targetDir)
    
    // Przekaż oryginalne daty modyfikacji plików
    const fileDates = files.map(file => ({
      name: file.name,
      lastModified: file.lastModified
    }))
    formData.append('fileDates', JSON.stringify(fileDates))
    
    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas uploadu')
    }
    
    return response.json()
  },

  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const response = await fetch(`${API_BASE}/files/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, targetPath })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas przenoszenia')
    }
  },

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    const response = await fetch(`${API_BASE}/files/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, targetPath })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas kopiowania')
    }
  },

  async createDirectory(dirPath: string): Promise<void> {
    const response = await fetch(`${API_BASE}/files/create-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dirPath })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas tworzenia katalogu')
    }
  },

  async deleteFile(filePath: string): Promise<void> {
    const response = await fetch(`${API_BASE}/files/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas usuwania')
    }
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const response = await fetch(`${API_BASE}/files/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Błąd podczas zmiany nazwy')
    }
  }
}
