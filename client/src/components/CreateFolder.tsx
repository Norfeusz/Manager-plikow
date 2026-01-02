import { useState } from 'react'
import { fileApi } from '../services/api'

interface CreateFolderProps {
  currentPath: string
  onFolderCreated: () => void
}

export default function CreateFolder({ currentPath, onFolderCreated }: CreateFolderProps) {
  const [showModal, setShowModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!folderName.trim()) {
      alert('Podaj nazwę folderu')
      return
    }
    
    setCreating(true)
    try {
      const newPath = `${currentPath}\\${folderName}`
      await fileApi.createDirectory(newPath)
      setFolderName('')
      setShowModal(false)
      onFolderCreated()
    } catch (error: any) {
      alert(`Błąd: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        📁 Nowy folder
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Utwórz nowy folder</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa folderu
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nazwa folderu"
                autoFocus
              />
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Lokalizacja: <span className="font-mono">{currentPath}</span>
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !folderName.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {creating ? 'Tworzenie...' : 'Utwórz'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFolderName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
