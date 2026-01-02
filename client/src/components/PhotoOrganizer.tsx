import { useState } from 'react'
import { FileMetadata } from '../../../../shared/src/types'
import { exifApi } from '../services/exif-api'

interface PhotoOrganizerProps {
  selectedFiles: FileMetadata[]
  currentPath: string
  onComplete: () => void
}

export default function PhotoOrganizer({ selectedFiles, currentPath, onComplete }: PhotoOrganizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetDir, setTargetDir] = useState('D:\\DATA\\Zdjecia')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

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
      
      const result = await exifApi.organizePhotos(sourcePath, targetDir)
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
              </p>
              <p className="text-sm text-gray-600">
                Zdjęcia zostaną przeniesione do struktury:
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded block mt-2">
                {targetDir}/YYYY/MM/YYYY-MM-DD_nazwa.jpg
              </code>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Katalog docelowy:
              </label>
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="D:\DATA\Zdjecia"
              />
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
    </>
  )
}
