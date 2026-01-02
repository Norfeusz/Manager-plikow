import { useState } from 'react'
import FileBrowser from './components/FileBrowser'
import FileUploader from './components/FileUploader'
import CreateFolder from './components/CreateFolder'
import DriveSelector from './components/DriveSelector'
import { driveStorage } from './services/drive-storage'

function App() {
  const [currentPath, setCurrentPath] = useState('D:\\DATA')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedDriveId, setSelectedDriveId] = useState('main')

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleDriveChange = (path: string) => {
    setCurrentPath(path)
    setRefreshKey(prev => prev + 1)
  }

  const handleDriveSelect = (driveId: string) => {
    setSelectedDriveId(driveId)
  }

  const handleConfigureLocation = () => {
    // Wywołaj funkcję z DriveSelector przez window
    ;(window as any).openDriveConfig?.(selectedDriveId)
  }

  // Sprawdź czy aktualny dysk wymaga konfiguracji
  const getCurrentDrive = () => {
    const drives = driveStorage.getDrives()
    return drives.find(d => d.id === selectedDriveId)
  }

  const currentDrive = getCurrentDrive()
  const showConfigButton = currentDrive?.needsConfiguration

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Manager Plików</h1>
            <div className="flex gap-2">
              {showConfigButton && (
                <button
                  onClick={handleConfigureLocation}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                  title="Wskaż lokalizację dysku"
                >
                  📍 Wskaż lokalizację
                </button>
              )}
              <CreateFolder 
                currentPath={currentPath}
                onFolderCreated={handleRefresh}
              />
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                🔄 Odśwież
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Zakładki dysków */}
      <DriveSelector 
        onDriveChange={handleDriveChange}
        onDriveSelect={handleDriveSelect}
      />
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <FileUploader 
              currentPath={currentPath}
              onUploadComplete={handleRefresh}
            />
            <FileBrowser 
              key={refreshKey}
              initialPath={currentPath}
              onPathChange={setCurrentPath}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
