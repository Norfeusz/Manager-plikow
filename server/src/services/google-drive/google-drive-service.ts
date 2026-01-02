import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GoogleDriveService {
  private oauth2Client: OAuth2Client

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    
    console.log('GoogleDriveService init:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri
    })
    
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth credentials in environment variables')
    }
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )
  }

  // Generuj URL do autoryzacji
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })
  }

  // Wymień kod autoryzacyjny na tokeny
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    return tokens
  }

  // Ustaw tokeny (z localStorage)
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens)
  }

  // Pobierz listę plików z folderu
  async listFiles(folderId: string = 'root') {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents)',
      orderBy: 'folder,name'
    })

    return response.data.files || []
  }

  // Pobierz metadane pliku
  async getFileMetadata(fileId: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents'
    })

    return response.data
  }

  // Utwórz folder
  async createFolder(name: string, parentId: string = 'root') {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name'
    })

    return response.data
  }

  // Upload pliku
  async uploadFile(fileName: string, filePath: string, parentId: string = 'root') {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })
    const fs = require('fs')

    const fileMetadata = {
      name: fileName,
      parents: [parentId]
    }

    const media = {
      body: fs.createReadStream(filePath)
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name'
    })

    return response.data
  }

  // Przenieś plik
  async moveFile(fileId: string, newParentId: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    // Pobierz obecnych rodziców
    const file = await drive.files.get({
      fileId,
      fields: 'parents'
    })

    const previousParents = file.data.parents?.join(',')

    const response = await drive.files.update({
      fileId,
      addParents: newParentId,
      removeParents: previousParents,
      fields: 'id, parents'
    })

    return response.data
  }

  // Kopiuj plik
  async copyFile(fileId: string, newParentId: string, newName?: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    const response = await drive.files.copy({
      fileId,
      requestBody: {
        name: newName,
        parents: [newParentId]
      }
    })

    return response.data
  }

  // Usuń plik
  async deleteFile(fileId: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    await drive.files.delete({
      fileId
    })

    return { success: true }
  }

  // Zmień nazwę pliku
  async renameFile(fileId: string, newName: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })

    const response = await drive.files.update({
      fileId,
      requestBody: {
        name: newName
      }
    })

    return response.data
  }

  // Pobierz plik (download)
  async downloadFile(fileId: string, destPath: string) {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client })
    const fs = require('fs')

    const dest = fs.createWriteStream(destPath)

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => resolve({ success: true }))
        .on('error', reject)
        .pipe(dest)
    })
  }
}
