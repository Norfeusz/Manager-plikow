import { useState } from 'react'
import { DriveConfig } from '../../../../shared/src/types'
import { driveStorage } from '../services/drive-storage'
import { fileApi } from '../services/api'

interface DriveSelectorProps {
  onDriveChange: (path: string) => void
  onDriveSelect: (driveId: string) => void
}

export default function DriveSelector({ onDriveChange, onDriveSelect }: DriveSelectorProps) {
  const [drives, setDrives] = useState<DriveConfig[]>(driveStorage.getDrives())
  const [selectedDriveId, setSelectedDriveId] = useState('main')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configuringDrive, setConfiguringDrive] = useState<DriveConfig | null>(null)
  const [browsePath, setBrowsePath] = useState('')
  const [folders, setFolders] = useState<any[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showingDrives, setShowingDrives] = useState(false)
  const [systemDrives, setSystemDrives] = useState<any[]>([])

  const handleDriveClick = (drive: DriveConfig) => {
    // Zawsze wybierz dysk
    setSelectedDriveId(drive.id)
    onDriveSelect(drive.id)
    
    // Google Drive - nie potrzebuje lokalnej ścieżki
    if (drive.isGoogleDrive) {
      const folderId = drive.googleDriveFolderId || 'root'
      onDriveChange(`gdrive:${folderId}`)
      return
    }
    
    // Dysk lokalny
    const path = drive.customPath || drive.defaultPath
    
    if (!path && drive.needsConfiguration) {
      // Brak ścieżki - nie możemy załadować zawartości
      return
    }
    
    if (path) {
      onDriveChange(path)
    }
  }

  const openConfigModal = (drive: DriveConfig) => {
    setConfiguringDrive(drive)
    // Zacznij od widoku dysków zamiast konkretnej ścieżki
    showDrivesView()
    setShowConfigModal(true)
  }

  const showDrivesView = async () => {
    setLoading(true)
    setShowingDrives(true)
    try {
      const result = await fileApi.getDrives()
      setSystemDrives(result.drives || [])
      setFolders([])
      setBrowsePath('Komputer')
      setParentPath(null)
    } catch (error) {
      console.error('Błąd ładowania dysków:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async (path: string) => {
    setLoading(true)
    setShowingDrives(false)
    try {
      const result = await fileApi.browseDirectory(path)
      const onlyFolders = result.items.filter(item => item.isDirectory)
      setFolders(onlyFolders)
      setParentPath(result.parentPath)
      setBrowsePath(result.currentPath)
    } catch (error) {
      console.error('Błąd ładowania folderów:', error)
      setFolders([])
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folder: any) => {
    loadFolders(folder.path)
  }

  const handleSystemDriveClick = (drive: any) => {
    loadFolders(drive.path)
  }

  const handleGoUp = () => {
    if (parentPath) {
      // Sprawdź czy jesteśmy na poziomie roota dysku (np. D:\)
      if (parentPath === browsePath || parentPath.match(/^[A-Z]:\\$/)) {
        showDrivesView()
      } else {
        loadFolders(parentPath)
      }
    } else {
      // Jeśli nie ma parent path, wróć do widoku dysków
      showDrivesView()
    }
  }

  const handleSaveConfiguration = () => {
    if (configuringDrive) {
      driveStorage.updateDrivePath(configuringDrive.id, browsePath)
      
      // Odśwież listę dysków
      const updatedDrives = driveStorage.getDrives()
      setDrives(updatedDrives)
      
      setShowConfigModal(false)
      setConfiguringDrive(null)
      
      // Przełącz na skonfigurowany dysk
      setSelectedDriveId(configuringDrive.id)
      onDriveSelect(configuringDrive.id)
      onDriveChange(browsePath)
    }
  }

  // Eksportuj funkcję do otwarcia modala konfiguracji
  const openConfigModalForCurrentDrive = (driveId: string) => {
    const drive = drives.find(d => d.id === driveId)
    if (drive) {
      openConfigModal(drive)
    }
  }

  // Udostępnij funkcję na zewnątrz przez ref lub callback
  ;(window as any).openDriveConfig = openConfigModalForCurrentDrive

  const isDriveConfigured = (drive: DriveConfig) => {
    if (drive.isGoogleDrive) {
      // Google Drive nie wymaga konfiguracji lokalnej ścieżki
      return true
    }
    return !drive.needsConfiguration || !!drive.customPath
  }

  return (
    <>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-3 overflow-x-auto">
            {drives.map((drive) => (
              <button
                key={drive.id}
                onClick={() => handleDriveClick(drive)}
                className={`px-4 py-2 rounded whitespace-nowrap transition-colors ${
                  selectedDriveId === drive.id
                    ? 'bg-blue-500 text-white'
                    : isDriveConfigured(drive)
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                {drive.name}
                {!isDriveConfigured(drive) && ' ⚠️'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal konfiguracji */}
      {showConfigModal && configuringDrive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[700px] max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Wskaż lokalizację: {configuringDrive.name}
            </h3>
            
            {/* Aktualna ścieżka */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz folder główny dla tego dysku
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleGoUp}
                  disabled={showingDrives && !parentPath}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ⬆️ W górę
                </button>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
                  {browsePath}
                </div>
              </div>
            </div>
            
            {/* Lista folderów lub dysków */}
            <div className="mb-4 border rounded flex-1 overflow-y-auto" style={{ minHeight: '300px', maxHeight: '400px' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : showingDrives ? (
                // Widok dysków systemowych
                systemDrives.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Brak dostępnych dysków
                  </div>
                ) : (
                  systemDrives.map((drive) => (
                    <div
                      key={drive.path}
                      onClick={() => handleSystemDriveClick(drive)}
                      className="flex items-center px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer"
                    >
                      <span className="text-xl mr-3">💾</span>
                      <span className="text-sm font-medium text-blue-600">{drive.name}</span>
                    </div>
                  ))
                )
              ) : (
                // Widok folderów
                folders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Brak podfolderów
                  </div>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.path}
                      onClick={() => handleFolderClick(folder)}
                      className="flex items-center px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer"
                    >
                      <span className="text-xl mr-3">📁</span>
                      <span className="text-sm font-medium text-blue-600">{folder.name}</span>
                    </div>
                  ))
                )
              )}
            </div>
            
            <div className="mb-2 p-3 bg-blue-50 rounded text-sm text-blue-800">
              💡 {showingDrives ? 'Wybierz dysk, a następnie folder główny' : 'Wybierz główny folder, który będzie punktem startowym dla tego dysku'}
            </div>
            
            {/* Przyciski akcji */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveConfiguration}
                disabled={showingDrives}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ✓ Zapisz tę lokalizację
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(false)
                  setConfiguringDrive(null)
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
