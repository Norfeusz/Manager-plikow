import { Router, Request, Response } from 'express'
import dotenv from 'dotenv'
import { GoogleDriveService } from '../services/google-drive/google-drive-service'

// Wczytaj zmienne środowiskowe przed inicjalizacją serwisu
dotenv.config()

const router = Router()
const driveService = new GoogleDriveService()

// Przechowywanie tokenów w pamięci (w produkcji użyj bazy danych lub sesji)
const tokenStore = new Map<string, any>()

// GET /api/auth/google - rozpocznij autoryzację
router.get('/google', (req: Request, res: Response) => {
  try {
    // Debug - sprawdź czy zmienne środowiskowe są wczytane
    console.log('Environment check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    })
    
    const authUrl = driveService.getAuthUrl()
    console.log('Generated auth URL:', authUrl)
    res.json({ authUrl })
  } catch (error: any) {
    console.error('Błąd generowania URL autoryzacji:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/auth/google/callback - callback po autoryzacji
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Brak kodu autoryzacyjnego')
    }

    const tokens = await driveService.getTokens(code)
    
    // Zapisz tokeny (tutaj w pamięci, ale można użyć userId jako klucza)
    const userId = 'default-user' // W przyszłości: req.user.id
    tokenStore.set(userId, tokens)

    // Przekieruj do frontendu z sukcesem
    res.redirect(`http://localhost:5174/?google_auth=success`)
  } catch (error: any) {
    console.error('Błąd callback autoryzacji:', error)
    res.redirect(`http://localhost:5174/?google_auth=error`)
  }
})

// POST /api/auth/google/tokens - zapisz tokeny z frontendu
router.post('/google/tokens', (req: Request, res: Response) => {
  try {
    const { tokens } = req.body
    
    if (!tokens) {
      return res.status(400).json({ error: 'Brak tokenów' })
    }

    const userId = 'default-user'
    tokenStore.set(userId, tokens)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd zapisywania tokenów:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/auth/google/status - sprawdź czy użytkownik jest zalogowany
router.get('/google/status', (req: Request, res: Response) => {
  try {
    const userId = 'default-user'
    const tokens = tokenStore.get(userId)
    
    res.json({ 
      authenticated: !!tokens,
      hasTokens: !!tokens
    })
  } catch (error: any) {
    console.error('Błąd sprawdzania statusu:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/auth/google/logout - wyloguj (usuń tokeny)
router.post('/google/logout', (req: Request, res: Response) => {
  try {
    const userId = 'default-user'
    tokenStore.delete(userId)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('Błąd wylogowania:', error)
    res.status(500).json({ error: error.message })
  }
})

// Eksport tokenStore żeby inne moduły mogły go używać
export { tokenStore }
export default router
