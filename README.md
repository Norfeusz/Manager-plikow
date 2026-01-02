# Manager Plików

Aplikacja webowa do zarządzania plikami multimedialnymi (zdjęcia, filmy, dokumenty) z obsługą wielu dysków i nośników.

## ✨ Funkcje

- 📁 Przeglądanie folderów i plików z wizualizacją
- 📤 Upload plików (drag & drop)
- ✂️ Przenoszenie, kopiowanie, usuwanie plików
- 🗂️ Tworzenie nowych folderów
- 💾 Zarządzanie wieloma dyskami (główny, Sony, Toshiba, Google Drive)
- ⚙️ Konfigurowalne lokalizacje dysków zewnętrznych
- 🎯 Intuicyjny interfejs z zakładkami dysków

## 🚀 Szybki Start

### Instalacja

```bash
npm install
```

### Uruchomienie (Windows)

Najłatwiejszy sposób - użyj launchera:

```bash
start.bat
```

Launcher automatycznie uruchomi serwer, klienta i otworzy przeglądarkę.

### Development - Ręcznie

**Terminal 1 - Backend:**

```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
```

- Frontend: http://localhost:5174
- Backend: http://localhost:5000

## 📦 Struktura Projektu

- `client/` - Frontend (React + Vite + TypeScript + Tailwind CSS)
- `server/` - Backend (Node.js + Express + TypeScript)
- `shared/` - Wspólne typy TypeScript
- `dokumentacja/` - Dokumentacja techniczna
- `start.bat` - Launcher aplikacji

## 📖 Dokumentacja

Szczegółowa dokumentacja techniczna: `dokumentacja/dokumentacja-techniczna.md`

## 🛠️ Stack Technologiczny

**Frontend:**

- React 18+
- Vite
- TypeScript
- Tailwind CSS

**Backend:**

- Node.js
- Express
- TypeScript
- fs-extra
- multer

## 📝 Status

Wersja: 0.2.0  
Status: W aktywnym rozwoju

### Zaimplementowane

- ✅ Przeglądanie plików i folderów
- ✅ Upload plików
- ✅ Operacje na plikach (przenieś, kopiuj, usuń)
- ✅ Zarządzanie folderami
- ✅ System dysków z konfiguracją

### W planach

- 🔄 Wykrywanie duplikatów
- 🔄 Odczyt EXIF
- 🔄 Automatyczne nazewnictwo YYYY-MM-DD
- 🔄 Integracja z Google Drive

## 📄 Licencja

Projekt prywatny
