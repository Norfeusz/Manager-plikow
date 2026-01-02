import axios from 'axios'
import { BrowseResponse } from '../../../shared/src/types'

const API_BASE = 'http://localhost:5000/api'

export const googleDriveApi = {
  // OAuth
  getAuthUrl: async () => {
    const response = await axios.get(`${API_BASE}/auth/google`)
    return response.data.authUrl
  },
  
  saveTokens: async (code: string) => {
    await axios.post(`${API_BASE}/auth/google/tokens`, { code })
  },
  
  getAuthStatus: async () => {
    const response = await axios.get(`${API_BASE}/auth/google/status`)
    return response.data.authenticated
  },
  
  logout: async () => {
    await axios.post(`${API_BASE}/auth/google/logout`)
  },
  
  // File operations
  browse: async (folderId?: string): Promise<BrowseResponse> => {
    const response = await axios.get(`${API_BASE}/google-drive/browse`, {
      params: { folderId: folderId || 'root' }
    })
    return response.data
  },
  
  createFolder: async (name: string, parentId?: string) => {
    const response = await axios.post(`${API_BASE}/google-drive/create-folder`, {
      name,
      parentId
    })
    return response.data
  },
  
  upload: async (fileName: string, filePath: string, parentId?: string) => {
    const response = await axios.post(`${API_BASE}/google-drive/upload`, {
      fileName,
      filePath,
      parentId
    })
    return response.data
  },
  
  move: async (fileId: string, newParentId: string) => {
    await axios.post(`${API_BASE}/google-drive/move`, {
      fileId,
      newParentId
    })
  },
  
  copy: async (fileId: string, newParentId: string, newName?: string) => {
    await axios.post(`${API_BASE}/google-drive/copy`, {
      fileId,
      newParentId,
      newName
    })
  },
  
  delete: async (fileId: string) => {
    await axios.delete(`${API_BASE}/google-drive/delete`, {
      data: { fileId }
    })
  },
  
  rename: async (fileId: string, newName: string) => {
    await axios.post(`${API_BASE}/google-drive/rename`, {
      fileId,
      newName
    })
  }
}
