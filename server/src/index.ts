import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs-extra'
import path from 'path'
import filesRouter from './routes/files'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Upewnij się że folder temp istnieje
const uploadsDir = path.join(process.cwd(), 'uploads', 'temp')
fs.ensureDirSync(uploadsDir)

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Manager Plikow API is running' })
})

// Routes
app.use('/api/files', filesRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
