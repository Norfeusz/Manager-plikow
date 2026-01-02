import path from 'path'
import { FileType } from '../../../shared/src/types'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw']
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v']

export function getFileType(filename: string, isDirectory: boolean): FileType {
  if (isDirectory) return 'directory'
  
  const ext = path.extname(filename).toLowerCase()
  
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  
  return 'other'
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
