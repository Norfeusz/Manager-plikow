import { useState, useEffect } from 'react'
import { FileMetadata } from '../../../../shared/src/types'
import { fileApi } from '../services/api'

interface FileActionsProps {
  selectedFiles: FileMetadata[]
  currentPath: string
  onActionComplete: () => void
  onClearSelection: () => void
}

export default function FileActions({ 
  selectedFiles, 
  currentPath, 
  onActionComplete,
  onClearSelection 
}: FileActionsProps) {
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [targetPath, setTargetPath] = useState('')
  const [processing, setProcessing] = useState(false)
  const [operation, setOperation] = useState<'move' | 'copy'>('move')
  const [browsePath, setBrowsePath] = useState('')
  const [folders, setFolders] = useState<FileMetadata[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [loadingFolders, setLoadingFolders] = useState(false)

  useEffect(() => {
    if (showMoveModal) {
      loadFolders(targetPath)
    }
  }, [showMoveModal])

  const loadFolders = async (path: string) => {
    setLoadingFolders(true)
    try {
      const result = await fileApi.browseDirectory(path)
      const onlyFolders = result.items.filter(item => item.isDirectory)
      setFolders(onlyFolders)
      setParentPath(result.parentPath)
      setBrowsePath(result.currentPath)
    } catch (error: any) {
      console.error('Błąd ładowania folderów:', error)
    } finally {
      setLoadingFolders(false)
    }
  }

  const handleFolderClick = (folder: FileMetadata) => {
    loadFolders(folder.path)
    setTargetPath(folder.path)
  }

  const handleGoUp = () => {
    if (parentPath) {
      loadFolders(parentPath)
      setTargetPath(parentPath)
    }
  }

  const handleMove = async () => {
    if (!targetPath.trim()) {
      alert('Wybierz folder docelowy')
      return
    }
    
    setProcessing(true)
    try {
      for (const file of selectedFiles) {
        const newPath = `${targetPath}\\${file.name}`
        
        if (operation === 'move') {
          await fileApi.moveFile(file.path, newPath)
        } else {
          await fileApi.copyFile(file.path, newPath)
        }
      }
      
      alert(`${operation === 'move' ? 'Przeniesiono' : 'Skopiowano'} ${selectedFiles.length} plik(ów)`)
      setShowMoveModal(false)
      setTargetPath('')
      onClearSelection()
      onActionComplete()
    } catch (error: any) {
      alert(`Błąd: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Czy na pewno chcesz usunąć ${selectedFiles.length} plik(ów)?`)) {
      return
    }
    
    setProcessing(true)
    try {
      for (const file of selectedFiles) {
        await fileApi.deleteFile(file.path)
      }
      
      alert(`Usunięto ${selectedFiles.length} plik(ów)`)
      onClearSelection()
      onActionComplete()
    } catch (error: any) {
      alert(`Błąd: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const openMoveModal = (op: 'move' | 'copy') => {
    setOperation(op)
    setTargetPath(currentPath)
    setShowMoveModal(true)
  }

  if (selectedFiles.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              Zaznaczono: {selectedFiles.length} plik(ów)
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Wyczyść zaznaczenie
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => openMoveModal('move')}
              disabled={processing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              ➡️ Przenieś
            </button>
            <button
              onClick={() => openMoveModal('copy')}
              disabled={processing}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              📋 Kopiuj
            </button>
            <button
              onClick={handleDelete}
              disabled={processing}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              🗑️ Usuń
            </button>
          </div>
        </div>
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[700px] max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              {operation === 'move' ? 'Przenieś pliki' : 'Kopiuj pliki'}
            </h3>
            
            {/* Aktualna ścieżka */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz folder docelowy
              </label>
              <div className="flex items-center gap-2 mb-2">
                {parentPath && (
                  <button
                    onClick={handleGoUp}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    ⬆️ W górę
                  </button>
                )}
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
                  {browsePath || targetPath}
                </div>
              </div>
            </div>
            
            {/* Lista folderów */}
            <div className="mb-4 border rounded flex-1 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '300px' }}>
              {loadingFolders ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Brak podfolderów
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.path}
                    onClick={() => handleFolderClick(folder)}
                    className={`flex items-center px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer ${
                      targetPath === folder.path ? 'bg-blue-100' : ''
                    }`}
                  >
                    <span className="text-xl mr-3">📁</span>
                    <span className="text-sm font-medium text-blue-600">{folder.name}</span>
                  </div>
                ))
              )}
            </div>
            
            {/* Lista plików do przeniesienia */}
            <div className="mb-4 p-3 bg-gray-50 rounded max-h-32 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Pliki do {operation === 'move' ? 'przeniesienia' : 'skopiowania'}:</p>
              <ul className="text-sm space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="text-gray-700">• {file.name}</li>
                ))}
              </ul>
            </div>
            
            {/* Przyciski akcji */}
            <div className="flex gap-2">
              <button
                onClick={handleMove}
                disabled={processing || !targetPath.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {processing ? 'Przetwarzanie...' : operation === 'move' ? 'Przenieś tutaj' : 'Kopiuj tutaj'}
              </button>
              <button
                onClick={() => {
                  setShowMoveModal(false)
                  setTargetPath('')
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
