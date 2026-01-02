import axios from 'axios'
import { ExifData, OrganizePhotosResult } from '../../../shared/src/types'

const API_BASE = 'http://localhost:5000/api'

export const exifApi = {
  // Odczyt metadanych EXIF
  getExif: async (filePath: string): Promise<ExifData> => {
    const response = await axios.get(`${API_BASE}/files/exif`, {
      params: { path: filePath }
    })
    return response.data
  },
  
  // Organizacja zdjęć według daty EXIF
  organizePhotos: async (sourcePath: string, targetBaseDir: string): Promise<OrganizePhotosResult> => {
    const response = await axios.post(`${API_BASE}/files/organize-photos`, {
      sourcePath,
      targetBaseDir
    })
    return response.data
  }
}
