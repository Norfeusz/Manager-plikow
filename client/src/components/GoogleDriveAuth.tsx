import { useState, useEffect } from 'react'
import { googleDriveApi } from '../services/google-drive-api'

export const GoogleDriveAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
    
    // Sprawdź czy wróciło z Google OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const authResult = urlParams.get('google_auth')
    
    if (authResult === 'success') {
      setIsAuthenticated(true)
      // Wyczyść parametry z URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (authResult === 'error') {
      alert('Błąd autoryzacji Google Drive')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const authenticated = await googleDriveApi.getAuthStatus()
      setIsAuthenticated(authenticated)
    } catch (error) {
      console.error('Błąd sprawdzania autoryzacji:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthorize = async () => {
    try {
      const authUrl = await googleDriveApi.getAuthUrl()
      
      // Przekieruj cały tab do Google OAuth (backend obsłuży callback)
      window.location.href = authUrl
    } catch (error) {
      console.error('Błąd autoryzacji:', error)
      alert('Błąd podczas inicjowania autoryzacji')
    }
  }

  const handleLogout = async () => {
    try {
      await googleDriveApi.logout()
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Błąd wylogowania:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Sprawdzanie...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated ? (
        <>
          <div className="flex items-center gap-2 text-green-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Google Drive połączony</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Rozłącz
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-medium">Brak połączenia z Google Drive</span>
          </div>
          <button
            onClick={handleAuthorize}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Autoryzuj Google Drive
          </button>
        </>
      )}
    </div>
  )
}
