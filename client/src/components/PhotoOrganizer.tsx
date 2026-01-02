import { useState, useEffect } from 'react'
import { FileMetadata } from '../../../../shared/src/types'
import { exifApi } from '../services/exif-api'
import { fileApi } from '../services/api'

interface PhotoOrganizerProps {
  selectedFiles: FileMetadata[]
  currentPath: string
  onComplete: () => void
  autoOpen?: boolean  // Nowy prop do automatycznego otwierania
}

export default function PhotoOrganizer({ selectedFiles, currentPath, onComplete, autoOpen = false }: PhotoOrganizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetDir, setTargetDir] = useState('F:\\Zdjecia')
  const [operation, setOperation] = useState<'move' | 'copy'>('move')
  const [useCustomFolder, setUseCustomFolder] = useState(false)
  const [customFolderName, setCustomFolderName] = useState('')
  const [assignToYear, setAssignToYear] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Stany dla prostego przenoszenia
  const [showSimpleMoveModal, setShowSimpleMoveModal] = useState(false)
  const [simpleTargetPath, setSimpleTargetPath] = useState('')
  const [browsePath, setBrowsePath] = useState('')
  const [folders, setFolders] = useState<FileMetadata[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [drives, setDrives] = useState<any[]>([])
  const [showDriveSelector, setShowDriveSelector] = useState(true)

  // Automatyczne otwarcie modalu gdy autoOpen = true
  useEffect(() => {
    if (autoOpen && selectedFiles.length > 0) {
      setIsOpen(true)
    }
  }, [autoOpen, selectedFiles.length])

  const loadFolders = async (path: string) => {
    setLoadingFolders(true)
    setShowDriveSelector(false)
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

  const loadDrives = async () => {
    try {
      const result = await fileApi.getDrives()
      setDrives(result.drives || [])
    } catch (error: any) {
      console.error('Błąd ładowania dysków:', error)
    }
  }

  const handleBackToDrives = () => {
    setShowDriveSelector(true)
    setBrowsePath('')
    setParentPath(null)
    setFolders([])
  }

  const handleSimpleMove = async () => {
    if (!simpleTargetPath.trim()) {
      alert('Wybierz folder docelowy')
      return
    }

    setIsProcessing(true)
    try {
      const sourcePath = selectedFiles.length > 1 ? currentPath : selectedFiles[0].path
      
      const result = await exifApi.simpleMovePhotos(
        sourcePath,
        simpleTargetPath
      )
      setResult(result)
      
      if (result.errors.length === 0) {
        setTimeout(() => {
          setShowSimpleMoveModal(false)
          setIsOpen(false)
          onComplete()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Błąd przenoszenia zdjęć:', error)
      alert(`Błąd: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOrganize = async () => {
    if (selectedFiles.length === 0) {
      alert('Nie wybrano plików do organizacji')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      // Jeśli zaznaczono wiele plików, organizuj cały folder
      const sourcePath = selectedFiles.length > 1 ? currentPath : selectedFiles[0].path
      
      const result = await exifApi.organizePhotos(
        sourcePath, 
        targetDir, 
        operation,
        useCustomFolder ? customFolderName : undefined,
        useCustomFolder ? assignToYear : true
      )
      setResult(result)
      
      if (result.errors.length === 0) {
        setTimeout(() => {
          setIsOpen(false)
          onComplete()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Błąd organizacji zdjęć:', error)
      alert(`Błąd: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const photoFiles = selectedFiles.filter(f => f.type === 'image')

  if (photoFiles.length === 0) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        title="Organizuj zdjęcia według daty EXIF"
      >
        📅 Organizuj zdjęcia
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Organizacja zdjęć według daty EXIF</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Wybrano:</strong> {photoFiles.length} zdjęć
              </p>{useCustomFolder ? customFolderName || '[nazwa]' : 'MM'}
              <p className="text-sm text-gray-600">
                Zdjęcia zostaną {operation === 'move' ? 'przeniesione' : 'skopiowane'} do struktury:
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded block mt-2">
                {targetDir}/YYYY/MM/YYYY-MM-DD_nazwa.jpg
              </code>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operacja:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="move"
                    checked={operation === 'move'}
                    onChange={(e) => setOperation(e.target.value as 'move' | 'copy')}
                    className="mr-2"
                  />
                  <span>Przenieś (usuń z oryginalnej lokalizacji)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="copy"
                    checked={operation === 'copy'}
                    onChange={(e) => setOperation(e.target.value as 'move' | 'copy')}
                    className="mr-2"
                  />
                  <span>Kopiuj (zostaw oryginał)</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Katalog docelowy:
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setTargetDir('F:\\Zdjecia')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    targetDir === 'F:\\Zdjecia' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  💿 F:\Zdjecia
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDir('D:\\DATA\\Zdjecia')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    targetDir === 'D:\\DATA\\Zdjecia' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  📁 D:\DATA\Zdjecia
                </button>
              </div>
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="F:\\Zdjecia lub inna lokalizacja"
              />
              <p className="text-xs text-gray-500 mt-1">
                Struktura: {targetDir}/{useCustomFolder ? (customFolderName || '[nazwa]') + '/' : ''}YYYY/{useCustomFolder ? '' : 'MM/'}YYYY-MM-DD_nazwa.jpg
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomFolder}
                  onChange={(e) => setUseCustomFolder(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Użyj niestandardowego folderu zamiast miesiąca
                </span>
              </label>
              
              {useCustomFolder && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customFolderName}
                    onChange={(e) => setCustomFolderName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Nazwa folderu (np. Wakacje, Rodzina, itp.)"
                  />
                  
                  {/* Opcja przypisania do roku */}
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={assignToYear}
                        onChange={() => setAssignToYear(true)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Przypisz do roku (struktura: {targetDir}/YYYY/{customFolderName || '[nazwa]'}/)
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={!assignToYear}
                        onChange={() => setAssignToYear(false)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Nie przypisuj do roku (struktura: {targetDir}/{customFolderName || '[nazwa]'}/)
                      </span>
                    </label>
                    {!assignToYear && (
                      <p className="text-xs text-amber-600 ml-6">
                        ⚠️ Zdjęcia bez daty EXIF zachowają oryginalną nazwę
                      </p>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Struktura: {targetDir}/{assignToYear ? 'YYYY/' : ''}{customFolderName || '[nazwa]'}/
                  </p>
                </div>
              )}
            </div>

            {result && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2">Wynik operacji:</h4>
                <div className="text-sm space-y-1">
                  <p>✅ Przetworzono: {result.processed}</p>
                  <p>📦 Przeniesiono: {result.moved}</p>
                  <p>⏭️ Pominięto: {result.skipped}</p>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-600 font-medium">Błędy:</p>
                      <ul className="list-disc list-inside text-xs text-red-600 max-h-40 overflow-y-auto">
                        {result.errors.map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSimpleMoveModal(true)
                  setShowDriveSelector(true)
                  loadDrives()
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                disabled={isProcessing}
              >
                📂 Prze nieś zdjęcia
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setResult(null)
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Anuluj
              </button>
              <button
                onClick={handleOrganize}
                disabled={isProcessing || !targetDir}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Przetwarzanie...
                  </span>
                ) : (
                  'Organizuj'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal prostego przenoszenia */}
      {showSimpleMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Przenieś zdjęcia do folderu</h3>
            
            <div className="mb-4 p-4 bg-green-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>Wybrano:</strong> {photoFiles.length} zdjęć
              </p>
              <p className="text-sm text-gray-600 mt-1">
                • Zdjęcia z datą EXIF → nazwa: YYYY-MM-DD_oryginalna.jpg<br/>
                • Zdjęcia bez daty → zachowana oryginalna nazwa
              </p>
            </div>

            {/* Przeglądarka folderów */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {showDriveSelector ? 'Wybierz dysk:' : 'Wybierz folder docelowy:'}
              </label>
              
              <div className="mb-2 flex items-center gap-2">
                {!showDriveSelector && (
                  <>
                    <button
                      onClick={handleBackToDrives}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      💿 Dyski
                    </button>
                    {parentPath && (
                      <button
                        onClick={() => {
                          loadFolders(parentPath)
                          setSimpleTargetPath(parentPath)
                        }}
                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        ⬆️ W górę
                      </button>
                    )}
                  </>
                )}
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                  {showDriveSelector ? 'Wybierz dysk' : (browsePath || 'Wybierz folder')}
                </div>
              </div>

              <div className="border rounded max-h-60 overflow-y-auto">
                {showDriveSelector ? (
                  drives.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Ładowanie dysków...</div>
                  ) : (
                    drives.map((drive) => (
                      <div
                        key={drive.path}
                        onClick={() => {
                          loadFolders(drive.path)
                          setSimpleTargetPath(drive.path)
                        }}
                        className="px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer flex items-center"
                      >
                        <span className="text-2xl mr-3">💿</span>
                        <div>
                          <div className="text-sm font-medium">{drive.name}</div>
                          <div className="text-xs text-gray-500">{drive.path}</div>
                        </div>
                      </div>
                    ))
                  )
                ) : loadingFolders ? (
                  <div className="p-4 text-center text-gray-500">Ładowanie...</div>
                ) : folders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Brak podfolderów</div>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.path}
                      onClick={() => {
                        loadFolders(folder.path)
                        setSimpleTargetPath(folder.path)
                      }}
                      className={`px-4 py-2 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer flex items-center ${
                        simpleTargetPath === folder.path ? 'bg-blue-100' : ''
                      }`}
                    >
                      <span className="text-xl mr-2">📁</span>
                      <span className="text-sm">{folder.name}</span>
                    </div>
                  ))
                )}
              </div>

              {!showDriveSelector && browsePath && (
                <button
                  onClick={() => {
                    setSimpleTargetPath(browsePath)
                  }}
                  className="mt-2 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors text-sm"
                >
                  ✓ Użyj tego folderu: {browsePath}
                </button>
              )}
            </div>

            {result && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2">Wynik operacji:</h4>
                <div className="text-sm space-y-1">
                  <p>✅ Przetworzono: {result.processed}</p>
                  <p>📦 Przeniesiono: {result.moved}</p>
                  <p>⏭️ Pominięto: {result.skipped}</p>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-600 font-medium">Błędy:</p>
                      <ul className="list-disc list-inside text-xs text-red-600 max-h-40 overflow-y-auto">
                        {result.errors.map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSimpleMoveModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Anuluj
              </button>
              <button
                onClick={handleSimpleMove}
                disabled={isProcessing || !simpleTargetPath}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Przenoszę...' : 'Przenieś'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
