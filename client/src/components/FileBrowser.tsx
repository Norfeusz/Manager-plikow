import { useState, useEffect } from 'react'
import { FileMetadata, BrowseResponse } from '../../../../shared/src/types'
import { fileApi } from '../services/api'
import { googleDriveApi } from '../services/google-drive-api'
import FileActions from './FileActions'
import PhotoOrganizer from './PhotoOrganizer'

interface FileBrowserProps {
  initialPath: string
  onPathChange?: (path: string) => void
}

export default function FileBrowser({ initialPath, onPathChange }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [data, setData] = useState<BrowseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([])

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath])

  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError(null)
    
    try {
      let result: BrowseResponse
      
      // Wykryj czy to Google Drive (format: gdrive:folderId)
      if (path.startsWith('gdrive:')) {
        const folderId = path.replace('gdrive:', '')
        result = await googleDriveApi.browse(folderId)
      } else {
        result = await fileApi.browseDirectory(path)
      }
      
      setData(result)
      onPathChange?.(path)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = (item: FileMetadata, e: React.MouseEvent) => {
    // Jednokrotne kliknięcie zaznacza (zarówno pliki jak i foldery)
    toggleFileSelection(item)
  }

  const handleItemDoubleClick = (item: FileMetadata) => {
    // Dwukrotne kliknięcie w folder - nawigacja
    if (item.isDirectory) {
      // Dla Google Drive używamy ID zamiast ścieżki
      if (currentPath.startsWith('gdrive:')) {
        setCurrentPath(`gdrive:${item.path}`)
      } else {
        setCurrentPath(item.path)
      }
      setSelectedFiles([])
    }
  }

  const toggleFileSelection = (file: FileMetadata) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.path === file.path)
      if (isSelected) {
        return prev.filter(f => f.path !== file.path)
      } else {
        return [...prev, file]
      }
    })
  }

  const isFileSelected = (file: FileMetadata) => {
    return selectedFiles.some(f => f.path === file.path)
  }

  const handleSelectAll = () => {
    if (data) {
      setSelectedFiles(data.items)
    }
  }

  const handleDeselectAll = () => {
    setSelectedFiles([])
  }

  const handleGoUp = () => {
    if (data?.parentPath) {
      setCurrentPath(data.parentPath)
      setSelectedFiles([])
    }
  }

  const getFileIcon = (item: FileMetadata) => {
    if (item.isDirectory) return '📁'
    if (item.type === 'image') return '🖼️'
    if (item.type === 'video') return '🎬'
    return '📄'
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pl-PL')
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Nagłówek z aktualną ścieżką */}
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {data?.parentPath && (
              <button
                onClick={handleGoUp}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ⬆️ W górę
              </button>
            )}
            <div className="text-sm text-gray-500">
              <span className="font-medium">Aktualna lokalizacja:</span>
              <span className="ml-2 font-mono">{currentPath}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel akcji na zaznaczonych plikach */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 items-center">
          {/* Przyciski zaznaczania */}
          {data && data.items.length > 0 && (
            <div className="flex gap-2 mr-4">
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                title="Zaznacz wszystkie pliki"
              >
                ✓ Zaznacz wszystkie
              </button>
              {selectedFiles.length > 0 && (
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                  title="Odznacz wszystkie"
                >
                  ✗ Odznacz
                </button>
              )}
            </div>
          )}
          
          {/* Akcje na zaznaczonych plikach */}
          <FileActions
            selectedFiles={selectedFiles}
            currentPath={currentPath}
            onActionComplete={() => loadDirectory(currentPath)}
            onClearSelection={() => setSelectedFiles([])}
          />
          <PhotoOrganizer
            selectedFiles={selectedFiles}
            currentPath={currentPath}
            onComplete={() => {
              setSelectedFiles([])
              loadDirectory(currentPath)
            }}
          />
        </div>
      </div>

      {/* Zawartość */}
      <div className="px-4 py-5 sm:p-6">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Ładowanie...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <strong>Błąd:</strong> {error}
          </div>
        )}

        {data && !loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nazwa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rozmiar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zmodyfikowano
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Pusty katalog
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr
                      key={item.path}
                      onClick={(e) => handleItemClick(item, e)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        isFileSelected(item) ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-2 py-4">
                        <input
                          type="checkbox"
                          checked={isFileSelected(item)}
                          onChange={() => toggleFileSelection(item)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{getFileIcon(item)}</span>
                          <span className={`text-sm ${item.isDirectory ? 'font-medium text-blue-600' : 'text-gray-900'}`}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.isDirectory ? '-' : formatSize(item.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.modifiedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stopka z liczbą elementów */}
      {data && !loading && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 sm:px-6">
          <p className="text-sm text-gray-700">
            Znaleziono: <span className="font-medium">{data.items.length}</span> element(ów)
            {' '}(katalogi: {data.items.filter(i => i.isDirectory).length}, 
            pliki: {data.items.filter(i => !i.isDirectory).length})
            {selectedFiles.length > 0 && (
              <span className="ml-4 text-blue-600 font-medium">
                | Zaznaczono: {selectedFiles.length} 
                (foldery: {selectedFiles.filter(f => f.isDirectory).length}, 
                pliki: {selectedFiles.filter(f => !f.isDirectory).length})
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
