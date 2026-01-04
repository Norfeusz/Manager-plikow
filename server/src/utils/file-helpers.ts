import path from 'path'
import { FileType } from '../../../shared/src/types'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw']
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp']
const VIDEO_COMPANION_EXTENSIONS = ['.lrv', '.thm'] // GoPro codec files

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

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

export function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext)
}

export function isVideoCompanionFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return VIDEO_COMPANION_EXTENSIONS.includes(ext)
}

export function getBasenameWithoutExt(filename: string): string {
  return path.basename(filename, path.extname(filename))
}
