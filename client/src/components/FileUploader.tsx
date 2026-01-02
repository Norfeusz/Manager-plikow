import { useState, useRef, useEffect } from 'react'
import { fileApi } from '../services/api'
import PhotoOrganizer from './PhotoOrganizer'
import { FileMetadata } from '../../../../shared/src/types'

interface FileUploaderProps {
  currentPath: string
  onUploadComplete: () => void
}

export default function FileUploader({ currentPath, onUploadComplete }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<FileMetadata[]>([])
  const [showPhotoOrganizer, setShowPhotoOrganizer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    
    setUploading(true)
    try {
      await fileApi.uploadFiles(files, currentPath)
      
      // Sprawdź czy przesłane zostały zdjęcia
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw']
      const uploadedImageFiles = files.filter(file => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        return imageExtensions.includes(ext)
      })
      
      // Jeśli przesłano zdjęcia, przygotuj metadata i otwórz organizator
      if (uploadedImageFiles.length > 0) {
        const photoMetadata: FileMetadata[] = uploadedImageFiles.map(file => ({
          name: file.name,
          path: `${currentPath}\\${file.name}`,
          size: file.size,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          type: 'image' as const,
          isDirectory: false
        }))
        
        setUploadedPhotos(photoMetadata)
        setShowPhotoOrganizer(true)
      } else {
        alert(`Przesłano ${files.length} plik(ów)`)
      }
      
      setFiles([])
      onUploadComplete()
    } catch (error: any) {
      alert(`Błąd uploadu: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatSize = (bytes: number) => {
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Sprawdź czy wybrane pliki zawierają zdjęcia
  const hasPhotos = () => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw']
    return files.some(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    })
  }

  const photoCount = () => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.raw']
    return files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    }).length
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Upload plików</h3>
      
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-gray-600">
            Przeciągnij pliki tutaj lub
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Wybierz pliki
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Lista wybranych plików */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Wybrane pliki ({files.length})</h4>
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Wyczyść
            </button>
          </div>
          <div className="border rounded max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 hover:bg-gray-50"
              >
                <span className="text-sm truncate flex-1">{file.name}</span>
                <span className="text-sm text-gray-500 ml-2">{formatSize(file.size)}</span>
              </div>
            ))}
          </div>
          
          {hasPhotos() && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm text-purple-700">
                📸 Wykryto {photoCount()} zdjęć - po przesłaniu automatycznie otworzy się organizator
              </p>
            </div>
          )}
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`flex-1 px-4 py-2 text-white rounded disabled:bg-gray-400 ${
                hasPhotos() 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {uploading ? 'Przesyłanie...' : (
                hasPhotos() 
                  ? `📸 Prześlij i organizuj ${photoCount()} zdjęć` 
                  : `Prześlij ${files.length} plik(ów)`
              )}
            </button>
          </div>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-4">
        Katalog docelowy: <span className="font-mono">{currentPath}</span>
      </p>
      
      {/* Automatyczne otwarcie organizatora zdjęć */}
      {showPhotoOrganizer && uploadedPhotos.length > 0 && (
        <PhotoOrganizer
          selectedFiles={uploadedPhotos}
          currentPath={currentPath}
          autoOpen={true}
          onComplete={() => {
            setShowPhotoOrganizer(false)
            setUploadedPhotos([])
            onUploadComplete()
          }}
        />
      )}
    </div>
  )
}
