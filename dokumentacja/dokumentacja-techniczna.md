# Dokumentacja Techniczna - Manager Plików

**Status projektu:** W aktywnym rozwoju  
**Ostatnia aktualizacja:** 3 stycznia 2026  
**Wersja:** 0.5.2

## Przegląd Projektu

Manager Plików to narzędzie webowe służące do zarządzania plikami multimedialnymi (zdjęcia, filmy) i dokumentami. Umożliwia automatyczne sortowanie, przenoszenie i organizowanie plików według określonych reguł.

## Cel Projektu

- Zarządzanie dużą ilością plików multimedialnych
- Automatyczne nazewnictwo plików według standardu YYYY-MM-DD_nazwa
- Organizacja plików w strukturze folderów według dat (rok/miesiąc)
- Obsługa wielu nośników pamięci (Dysk D, Sony, Toshiba, Google Drive)
- Wykrywanie duplikatów

## Stack Technologiczny

### Frontend

- **React 18+** - biblioteka UI
- **Vite** - build tool
- **TypeScript** - typowanie
- **Tailwind CSS** - stylowanie
- **React Router** - routing

### Backend

- **Node.js** - runtime
- **Express** - framework HTTP
- **TypeScript** - typowanie
- **fs-extra** - operacje na plikach
- **multer** - obsługa uploadu plików
- **googleapis** - integracja z Google Drive API
- **google-auth-library** - OAuth 2.0 dla Google Drive
- **exifr** - odczyt metadanych EXIF ze zdjęć (do implementacji)
- **cors** - obsługa CORS
- **dotenv** - zmienne środowiskowe

### API

- REST API
- Komunikacja przez HTTP
- Format JSON

## Struktura Projektu

```
Manager Plikow/
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx             # Główny komponent aplikacji
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Style globalne (Tailwind)
│   │   ├── components/         # Komponenty React
│   │   │   ├── FileBrowser.tsx        # Przeglądarka plików i folderów
│   │   │   ├── FileUploader.tsx       # Upload plików (drag & drop)
│   │   │   ├── DriveSelector.tsx      # Zakładki wyboru dysków
│   │   │   └── GoogleDriveAuth.tsx    # Autoryzacja Google Drive
│   │   ├── services/           # Serwisy API
│   │   │   ├── api.ts                 # Komunikacja z backendem (lokalne pliki)
│   │   │   ├── google-drive-api.ts    # Komunikacja z Google Drive API
│   │   ├── services/           # Serwisy API
│   │   │   ├── api.ts                 # Komunikacja z backendem
│   │   │   └── drive-storage.ts       # LocalStorage dla konfiguracji dysków
│   │   └── types/              # Typy TypeScript (używa shared/types)
│   ├── index.html
│   ├── vite.config.ts          # Konfiguracja Vite (proxy, port 5174)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── server/ ├── files.ts               # /api/files/* endpoints (lokalne pliki)
│   │   │   ├── auth.ts                # /api/auth/* endpoints (OAuth Google)
│   │   │   └── google-drive.ts        # /api/google-drive/* endpoints
│   │   ├── services/           # Logika biznesowa
│   │   │   ├── file-service.ts        # FileService (operacje na lokalnych plikach)
│   │   │   └── google-drive/
│   │   │       └── google-drive-service.ts  # GoogleDriveService (operacje na Google Drive)
│   │   └── utils/              # Narzędzia pomocnicze
│   │       └── file-helpers.ts        # Pomocnicze funkcje (getFileType, formatBytes)
│   ├── uploads/                # Folder tymczasowy dla uploadu
│   │   └── temp/
│   ├── .env                    # Zmienne środowiskowe (Google credentials)ile-service.ts        # FileService (operacje na plikach)
│   │   └── utils/              # Narzędzia pomocnicze
│   │       └── file-helpers.ts        # Pomocnicze funkcje (getFileType, formatBytes)
│   ├── uploads/                # Folder tymczasowy dla uploadu
│   │   └── temp/
│   ├── .gitignore
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                      # Kod wspólny (frontend + backend)
│   └── src/
│       ├── index.ts            # Eksport wszystkich typów
│       └── types.ts            # Wspólne typy TypeScript
│
├── dokumentacja/
│   └── dokumentacja-techniczna.md
│
├── start.bat                    # Launcher (uruchamia server + client + przeglądarkę)
├── package.json                 # Root package.json (workspace)
├── .gitignore
└── README.md
```

## Główne Funkcjonalności

### ✅ 1. Przeglądanie Plików i Folderów

**Status:** Zaimplementowane

- Wyświetlanie zawartości katalogów w formie tabeli
- Sortowanie: foldery na górze, następnie pliki alfabetycznie
- Ikony dla różnych typów plików:
  - 📁 Foldery
  - 🖼️ Zdjęcia (.jpg, .jpeg, .png, .gif, .bmp, .webp, .heic, .raw)
  - 🎬 Filmy (.mp4, .avi, .mov, .mkv, .wmv, .flv, .webm, .m4v)
  - 📄 Inne pliki
- Wyświetlanie metadanych: nazwa, rozmiar, typ, data modyfikacji
- Nawigacja: kliknięcie na folder otwiera jego zawartość
- Przycisk "W górę" do katalogu nadrzędnego
- Licznik elementów (foldery/pliki)

### ✅ 2. Upload Plików

**Status:** Zaimplementowane

- **Drag & Drop** - przeciągnij pliki do strefy uploadu
- **File Picker** - klasyczne wybieranie plików przez dialog systemowy
- Podgląd wybranych plików przed uploadem
- Lista z nazwami i rozmiarami plików
- Upload wielu plików jednocześnie
- Przesyłanie do aktualnie wybranego katalogu
- Automatyczne tworzenie katalogu docelowego jeśli nie istnieje

**Komponenty:**

- `FileUploader.tsx` - komponent uploadu z drag & drop

### ✅ 3. Zarządzanie Folderami

**Status:** Zaimplementowane

- Tworzenie nowych folderów
- Modal z polem tekstowym na nazwę
- Walidacja nazwy folderu
- Tworzenie w aktualnie wybranym katalogu
- Automatyczne odświeżenie listy po utworzeniu

**Komponenty:**

- `CreateFolder.tsx` - komponent tworzenia folderów

### ✅ 4. Operacje na Plikach i Folderach

**Status:** Zaimplementowane

#### Zaznaczanie elementów:

- **Jednokrotne kliknięcie** - zaznaczenie pliku lub folderu
- **Dwukrotne kliknięcie** - otwarcie folderu (nawigacja)
- **Checkbox** - zaznaczenie wielu plików i folderów
- **Przycisk "Zaznacz wszystkie"** - zaznaczenie wszystkich elementów w katalogu
- **Przycisk "Odznacz"** - wyczyszczenie zaznaczenia
- Wizualne podświetlenie zaznaczonych elementów (niebieskie tło)
- Licznik zaznaczonych elementów z podziałem na foldery/pliki

#### Akcje na zaznaczonych plikach i folderach:

- **Przenieś** - przeniesienie plików/folderów do innego folderu (z automatycznym usuwaniem pustych folderów źródłowych)
- **Kopiuj** - skopiowanie plików/folderów do innego folderu
- **Usuń** - usunięcie plików/folderów (z potwierdzeniem)

#### Wybór folderu docelowego:

- Modal z przeglądarką folderów
- Nawigacja po strukturze katalogów
- Widok wszystkich dostępnych dysków (C:\, D:\, E:\, itd.)
- Przycisk "W górę" do powrotu do dysków lub katalogu nadrzędnego
- Wizualne podświetlenie wybranego folderu

**Komponenty:**

- `FileActions.tsx` - panel akcji na plikach

### ✅ 5. System Dysków

**StNorbert S. (Google Drive)** - integracja z Google Drive API

#### Funkcje:

- Przełączanie między dyskami jednym kliknięciem
- Wizualne oznaczenie aktywnego dysku (niebieski)
- Oznaczenie ⚠️ dla nieskonfigurowanych dysków
- Przycisk "📍 Wskaż lokalizację" w headerze (dla dysków wymagających konfiguracji)
- Zapisywanie konfiguracji w **localStorage** przeglądarki z wersjonowaniem
- Automatyczne ładowanie zapisanych ścieżek przy następnym uruchomieniu
- Merge konfiguracji przy aktualizacji wersji (zachowanie customPath)

- Przełączanie między dyskami jednym kliknięciem
- Wizualne oznaczenie aktywnego dysku (niebieski)
- Oznaczenie ⚠️ dla nieskonfigurowanych dysków
- Przycisk "📍 Wskaż lokalizację" w headerze (dla dysków wymagających konfiguracji)
- Zapisywanie konfiguracji w **localStorage** przeglądarki
- Automatyczne ładowanie zapisanych ścieżek przy następnym uruchomieniu

#### Konfiguracja lokalizacji:

- Modal z listą wszystkich dostępnych dysków systemowych
- Nawigacja po folderach wybranego dysku
- Przycisk "W górę" do powrotu między dyskami
- Zapisanie wybranej ścieżki jako głównej dla danego dysku

**Komponenty:**

- `DriveSelector.tsx` - zakładki i konfiguracja dysków
- `drive-storage.ts` - zarządzanie konfiguracją w localStorage

### ✅ 6. Zarządzanie Zdjęciami

**Status:** Zaimplementowane

#### Funkcje:

- **Odczyt metadanych EXIF** - data wykonania, aparat, ustawienia, GPS
  - **Obsługa Google Drive** - tymczasowe pobieranie plików z Google Drive do odczytu EXIF
- **Automatyczne nazewnictwo** - `YYYY-MM-DD_oryginalna-nazwa.jpg`
- **Organizacja w strukturze** - `Zdjecia/YYYY/MM/plik.jpg` lub `Zdjecia/YYYY/NazwaWlasna/plik.jpg`
- **Wybór operacji** - przeniesienie (move) lub kopiowanie (copy) plików
- **Obsługa wielu źródeł**:
  - **Dyski lokalne** - standardowe operacje fs.move/fs.copy
  - **Google Drive → Dysk lokalny** - pobieranie plików przez Google Drive API
    - Automatyczne wykrywanie fileId Google Drive
    - Pobieranie pliku do docelowej lokalizacji
    - Usuwanie z Google Drive przy operacji "move"
    - Wykrywanie i filtrowanie folderów (tylko pliki)
- **Niestandardowe foldery** - możliwość organizacji w folderach o własnej nazwie zamiast numerów miesięcy
  - Opcja "Przypisz do roku" - folder w strukturze YYYY/NazwaFolderu lub bezpośrednio NazwaFolderu
  - Dla zdjęć bez daty: folder "Brak daty/NazwaFolderu"
- **Szybki wybór lokalizacji** - przyciski dla popularnych lokalizacji (F:\Zdjecia, D:\DATA\Zdjecia)
- **Proste przeniesienie** - możliwość przeniesienia zdjęć do wybranego folderu bez tworzenia struktury (tylko zmiana nazwy na YYYY-MM-DD_nazwa)
- **Domyślna lokalizacja** - F:\Zdjecia (Dysk Sony)
- **Batch processing** - przetwarzanie wielu zdjęć jednocześnie (każdy plik osobno)
- **Automatyczne czyszczenie** - usuwanie pustych folderów po przeniesieniu plików
- **Wykrywanie duplikatów** - porównanie rozmiaru pliku (wagi)
  - Jeśli plik o identycznej nazwie i rozmiarze już istnieje - oznaczenie jako duplikat, usunięcie źródła
  - Jeśli plik o identycznej nazwie ale innym rozmiarze - dodanie sufiksu \_1, \_2, itd.
  - **Uwaga:** Duplikaty nie są sprawdzane dla plików Google Drive (wymagałoby pobierania każdego pliku)
- **Data z właściwości pliku** - fallback na datę modyfikacji (mtime) gdy brak EXIF
  - Priorytet: EXIF DateTimeOriginal → DateTimeDigitized → DateTime → mtime (lokalne) / modifiedTime (Google Drive) → birthtime
  - Zachowanie oryginalnych dat podczas uploadu przez File.lastModified i fs.utimes()
- **Raport z operacji** - liczba przetworzonych/przeniesionych/pominiętych plików z listą błędów
- **Automatyczne otwieranie** - modal organizacji otwiera się automatycznie po uploaderze plików

#### Komponenty:

- `PhotoOrganizer.tsx` - komponent organizacji zdjęć z modalem
- `ExifService` (backend) - odczyt i przetwarzanie EXIF
- `exif-api.ts` - komunikacja z API

#### Endpoint API:

- `GET /api/files/exif?path=<ścieżka>` - odczyt metadanych EXIF
- `POST /api/files/organize-photos` - organizacja zdjęć według daty EXIF
  - Body: `{ sourcePath, targetBaseDir, operation: 'move'|'copy', customFolder?: string, assignToYear?: boolean }`
  - Zwraca: `{ processed, moved, skipped, errors[] }`
  - Automatyczne wykrywanie duplikatów (porównanie rozmiaru)
  - Automatyczne usuwanie pustych folderów źródłowych po operacji move
- `POST /api/files/simple-move-photos` - proste przeniesienie zdjęć do folderu
  - Body: `{ sourcePath, targetFolder }`
  - Zmienia tylko nazwę na YYYY-MM-DD_nazwa, nie tworzy struktury folderów
  - Automatyczne wykrywanie duplikatów

### 🔄 7. Zarządzanie Filmami

**Status:** Do implementacji

- Podobna logika jak dla zdjęć
- Odczyt metadanych video
- Struktura: `Filmy/YYYY/MM/plik.mp4`

### ✅ 8. Wykrywanie Duplikatów

**Status:** Zaimplementowane w organizacji zdjęć

- Porównanie nazwy pliku
- Porównanie rozmiaru pliku (wagi w bajtach)
- Jeśli identyczne (nazwa + rozmiar) - oznaczenie jako duplikat, pominięcie przenoszenia
- Jeśli różny rozmiar - dodanie sufiksu (\_1, \_2, itd.) i przeniesienie
- Automatyczne usuwanie plików źródłowych będących duplikatami (przy operacji move)

## API Endpointy

### ✅ Pliki

**`GET /api/files/browse?path=<ścieżka>`**

- Przeglądanie zawartości katalogu
- Parametry: `path` (string) - ścieżka do katalogu
- Zwraca: `BrowseResponse` - lista plików/folderów z metadanymi
- Status: Zaimplementowane

**`GET /api/files/drives`**

- Lista wszystkich dostępnych dysków systemowych (A-Z)
- Windows only
- Zwraca: lista dysków z nazwami i ścieżkami
- Status: Zaimplementowane

**`POST /api/files/upload`**

- Upload wielu plików
- Body: `multipart/form-data`
  - `files` - tablica plików
  - `targetDir` - katalog docelowy
  - `fileDates` - JSON string z oryginalnymi datami modyfikacji plików [{name, lastModified}]
- Multer zapisuje do temp, następnie przenosi do `targetDir`
- Przywraca oryginalne daty modyfikacji za pomocą fs.utimes()
- Zwraca: lista przesłanych plików z metadanymi
- Status: Zaimplementowane

**`POST /api/files/move`**

- Przeniesienie pliku lub folderu
- Body: `{ sourcePath: string, targetPath: string }`
- Tworzy katalog docelowy jeśli nie istnieje
- Obsługuje rekurencyjne przenoszenie folderów z zawartością
- Status: Zaimplementowane

**`POST /api/files/copy`**

- Skopiowanie pliku lub folderu
- Body: `{ sourcePath: string, targetPath: string }`
- Tworzy katalog docelowy jeśli nie istnieje
- Obsługuje rekurencyjne kopiowanie folderów z zawartością
- Status: Zaimplementowane
- Tworzy katalog docelowy jeśli nie istnieje
- Status: Zaimplementowane

**`POST /api/files/create-directory`**

- Utworzenie nowego katalogu
- Body: `{ dirPath: string }`
- Rekursywnie tworzy wszystkie katalogi w ścieżce
- Status: Zaimplementowane

**`DELETE /api/files/delete`**

- Usunięcie pliku lub katalogu
- Body: `{ filePath: string }`
- Rekursywnie usuwa katalogi z zawartością
- Status: Zaimplementowane

**`POST /api/files/rename`**

- Zmiana nazwy pliku/katalogu
- Body: `{ oldPath: string, newPath: string }`
- Status: Zaimplementowane

**`GET /api/health`**

- Health check endpoint
- Zwraca: `{ status: 'ok', message: '...' }`
- Status: Zaimplementowane

### ✅ Google Drive

**`GET /api/auth/google`**

- Rozpoczęcie autoryzacji OAuth 2.0
- Zwraca: `{ authUrl: string }` - URL do przekierowania użytkownika
- Status: Zaimplementowane

**`GET /api/auth/google/callback`**

- Callback po autoryzacji Google
- Query params: `code` - kod autoryzacyjny
- Przekierowuje z powrotem do frontendu z parametrem `google_auth=success`
- Status: Zaimplementowane

**`GET /api/auth/google/status`**

- Sprawdzenie statusu autoryzacji
- Zwraca: `{ authenticated: boolean }`
- Status: Zaimplementowane

**`POST /api/auth/google/logout`**

- Wylogowanie z Google Drive (usunięcie tokenów)
- Status: Zaimplementowane

**`GET /api/google-drive/browse?folderId=<id>`**

- Przeglądanie zawartości Google Drive
- Query params: `folderId` (domyślnie: 'root')
- Zwraca: `BrowseResponse` - lista plików/folderów
- Status: Zaimplementowane

**`POST /api/google-drive/create-folder`**

- Utworzenie folderu w Google Drive
- Body: `{ name: string, parentId?: string }`
- Status: Zaimplementowane

**`POST /api/google-drive/upload`**

- Upload pliku do Google Drive
- Body: `{ fileName: string, filePath: string, parentId?: string }`
- Status: Zaimplementowane

**`POST /api/google-drive/move`**

- Przeniesienie pliku w Google Drive
- Body: `{ fileId: string, newParentId: string }`
- Status: Zaimplementowane

**`POST /api/google-drive/copy`**

- Skopiowanie pliku w Google Drive
- Body: `{ fileId: string, newParentId: string, newName?: string }`
- Status: Zaimplementowane

**`DELETE /api/google-drive/delete`**

- Usunięcie pliku z Google Drive
- Body: `{ fileId: string }`
- Status: Zaimplementowane

**`POST /api/google-drive/rename`**

- Zmiana nazwy pliku w Google Drive
- Body: `{ fileId: string, newName: string }`
- Status: Zaimplementowane

### ✅ EXIF i Organizacja Zdjęć

**`GET /api/files/exif?path=<ścieżka>`**

- Odczyt metadanych EXIF ze zdjęcia
- Query params: `path` - ścieżka do pliku
- Zwraca: `ExifData` - data wykonania, aparat, ustawienia, GPS, itp.
- Status: Zaimplementowane

**`POST /api/files/organize-photos`**

- Automatyczna organizacja zdjęć według daty EXIF
- Body: `{ sourcePath: string, targetBaseDir: string, operation: 'move'|'copy', customFolder?: string, assignToYear?: boolean }`
  - sourcePath: plik lub folder ze zdjęciami
  - targetBaseDir: katalog bazowy (np. `F:\Zdjecia`)
  - operation: 'move' (przeniesienie) lub 'copy' (kopiowanie)
  - customFolder: opcjonalna nazwa folderu zamiast numeru miesiąca
  - assignToYear: czy przypisać folder do roku (domyślnie true)
- Tworzy strukturę:
  - Standardowa: `targetBaseDir/YYYY/MM/YYYY-MM-DD_nazwa.jpg`
  - Z customFolder i assignToYear=true: `targetBaseDir/YYYY/customFolder/YYYY-MM-DD_nazwa.jpg`
  - Z customFolder i assignToYear=false: `targetBaseDir/customFolder/YYYY-MM-DD_nazwa.jpg`
  - Bez daty EXIF: `targetBaseDir/Brak daty/customFolder/oryginalna_nazwa.jpg`
- **Wykrywanie duplikatów:**
  - Porównuje rozmiar pliku (fs.stat().size)
  - Jeśli nazwa i rozmiar identyczne → duplikat → pominięcie + usunięcie źródła (move)
  - Jeśli nazwa identyczna ale rozmiar różny → dodanie sufiksu \_1, \_2, itd.
- Automatycznie usuwa puste foldery źródłowe po operacji 'move' (rekursywnie w górę)
- Zwraca: `OrganizePhotosResult` - liczniki (processed, moved, skipped) i tablica błędów
- Status: Zaimplementowane

**`POST /api/files/simple-move-photos`**

- Proste przeniesienie zdjęć do wybranego folderu (bez tworzenia struktury YYYY/MM)
- Body: `{ sourcePath: string, targetFolder: string }`
  - sourcePath: plik lub folder ze zdjęciami
  - targetFolder: docelowy folder
- Zmienia nazwy na format YYYY-MM-DD_nazwa.jpg (z daty EXIF lub mtime)
- **Wykrywanie duplikatów:** jak w organize-photos
- Automatycznie usuwa puste foldery źródłowe
- Zwraca: `OrganizePhotosResult`
- Status: Zaimplementowane

### 🔄 Do implementacji

**`GET /api/files/metadata?path=<ścieżka>`**

- Odczyt metadanych EXIF ze zdjęć
- Zwraca: data wykonania, aparat, ustawienia

### 🔄 Duplikaty (Do implementacji)

**`POST /api/duplicates/check`**

- Sprawdzenie duplikatów w katalogu
- Body: `{ path: string, recursive: boolean }`
- Zwraca: lista duplikatów

**`POST /api/duplicates/handle`**

- Obsługa duplikatów (usuń/przenieś)
- Body: `{ duplicates: DuplicateInfo[], action: 'delete' | 'move' }`

## Typy Danych (Shared)

Plik: `shared/src/types.ts`

```typescript
export type FileType = "image" | "video" | "other" | "directory";

export interface FileMetadata {
  name: string; // Nazwa pliku/folderu
  path: string; // Pełna ścieżka
  size: number; // Rozmiar w bajtach
  createdAt: string; // Data utworzenia (ISO string)
  modifiedAt: string; // Data modyfikacji (ISO string)
  exifDate?: string; // Data z EXIF (opcjonalnie)
  type: FileType; // Typ pliku
  isDirectory: boolean; // Czy to katalog
}

export interface Drive {
  id: string; // Identyfikator dysku
  name: string; // Nazwa wyświetlana
  path: string; // Ścieżka do dysku
  available: boolean; // Czy dysk jest dostępny
}

export interface DriveConfig {
  id: string; // Identyfikator dysku
  name: string; // Nazwa wyświetlana
  defaultPath?: string; // Domyślna ścieżka
  customPath?: string; // Ścieżka ustawiona przez użytkownika
  needsConfiguration: boolean; // Czy wymaga konfiguracji
  isGoogleDrive?: boolean; // Czy to dysk Google Drive
  googleDriveFolderId?: string; // ID folderu w Google Drive (domyślnie 'root')
}

export interface BrowseRequest {
  path: string; // Ścieżka do przeglądania
  driveId?: string; // ID dysku (opcjonalnie)
}

export interface BrowseResponse {
  currentPath: string; // Aktualna ścieżka
  parentPath: string | null; // Ścieżka nadrzędna (null dla root)
  items: FileMetadata[]; // Lista plików/folderów
}

export interface DuplicateInfo {
  original: FileMetadata; // Oryginalny plik
  duplicate: FileMetadata; // Duplikat
  confidence: number; // Pewność (0-1)
}
```

## Zmienne Środowiskowe

### Server (.env)

```

# Google Drive API Credentials
GOOGLE_CLIENT_ID=<twój_client_id>
GOOGLE_CLIENT_SECRET=<twój_client_secret>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

**Konfiguracja Google Drive:**

1. Stwórz projekt w [Google Cloud Console](https://console.cloud.google.com/)
2. Włącz Google Drive API
3. Utwórz OAuth 2.0 Client ID
4. Dodaj authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Skopiuj Client ID i Client Secret do pliku `.envRT=5000
   NODE_ENV=development

````

## Uruchomienie Projektu

### Instalacja zależności

```bash
# W głównym katalogu (instaluje wszystkie workspace)
npm install
````

### Development - Launcher (Zalecane)

**Windows:**

```bash
# Podwójne kliknięcie na:
start.bat
```

Launcher automatycznie:

1. Uruchamia backend (port 5000)
2. Uruchamia frontend (port 5174)
3. Otwiera przeglądarkę na http://localhost:5174
4. Czeka 5 sekund przed otwarciem przeglądarki (czas na start serwerów)

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

Dostęp:

- Frontend: http://localhost:5174
- Backend: http://localhost:5000
- API: http://localhost:5000/api/\*

### Build

```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

### Production

```bash
cd server
npm start
```

## Konfiguracja Portów

- **Backend:** 5000 (Express)
- **Frontend:** 5174 (Vite dev server)
- **Proxy:** Vite przekierowuje `/api/*` na `http://localhost:5000`

## LocalStorage

Aplikacja używa localStorage do przechowywania:

**Klucz:** `manager-plikow-drives`

**Zawartość:**

```json
[
  {
    "id": "main",
    "name": "Dysk główny (D)",
    "defaultPath": "D:\\DATA",
    "needsConfiguration": false
  },
  {
    "id": "sony",
    "name": "Dysk Sony (zdjęcia)",
    "customPath": "E:\\Zdjecia", // Ustawione przez użytkownika
    "needsConfiguration": true
  }
  // ... inne dyski
]
```

## Zasady Rozwoju

1. **Modularność** - małe, wyspecjalizowane pliki
2. **Typowanie** - wszystko w TypeScript z pełnym typowaniem
3. **Brak domysłów** - pytaj o niejasności
4. **Dokumentacja** - aktualizuj ten plik przy każdej zmianie
5. **Testy** - (do wdrożenia w przyszłości)

## Kolejne Kroki (TODO)

### Priorytet 1 - Następna iteracja

1. ✅ ~~Implementacja UI dla wyboru plików (drag & drop, file picker)~~
2. ✅ ~~UI do przeglądania struktury folderów~~
3. ✅ ~~Logika przenoszenia i kopiowania plików~~
4. ✅ ~~System zarządzania dyskami~~
5. 🔄 Wykrywanie duplikatów (porównanie nazwy + rozmiaru)
6. 🔄 Implementacja API do odczytu metadanych EXIF

### Priorytet 2 - Funkcje zaawansowane

7. 🔄 Automatyczne nazewnictwo plików YYYY-MM-DD_nazwa
8. 🔄 Organizacja plików w strukturze rok/miesiąc
9. 🔄 Przetwarzanie batch (wiele plików naraz)
10. 🔄 Historia operacji (undo)

### Priorytet 3 - Integracje

11. 🔄 Integracja z Google Drive API
12. 🔄 Synchronizacja między nośnikami

### Priorytet 4 - Optymalizacja

13. 🔄 Progress bar dla długich operacji
14. 🔄 Testy jednostkowe i E2E
15. 🔄 Optymalizacja wydajności (duże katalogi)
16. 🔄 Obsługa błędów i retry

## Znane Problemy i Ograniczenia

1. **Uprawnienia systemowe** - niektóre pliki systemowe Windows są niedostępne (EPERM)
   - Rozwiązanie: Błędy są przechwytywane i logowane, aplikacja działa dalej
2. **Brak weryfikacji ścieżek** - brak walidacji czy ścieżka docelowa jest bezpieczna

   - Do zrobienia: Dodać whitelist/blacklist ścieżek

3. **Brak limitu rozmiaru** - multer ma limit 1GB per plik

   - Do rozważenia: Zwiększenie lub konfigurowalny limit

4. **LocalStorage** - konfiguracja dysków zapisana tylko w przeglądarce

   - Ograniczenie: Po wyczyszczeniu cache trzeba skonfigurować ponownie
   - Do rozważenia: Backend endpoint do zapisywania konfiguracji

5. **Tylko Windows** - endpoint `/api/files/drives` działa tylko na Windows
   - Do zrobienia: Obsługa Linux/Mac (inny system dysków)

## Uwagi Techniczne

### Architektura

- **Monorepo** z workspace npm
- Shared types w folderze `shared/` używane przez frontend i backend
- Proxy w Vite przekierowuje `/api` na backend
- Backend działa na porcie 5000, frontend na 5174

### Backend (Express)

- Middleware: CORS, express.json()
- Multer dla uploadu z tempowym folderem `uploads/temp/`
- fs-extra dla operacji na plikach (synchroniczne i asynchroniczne)
- Automatyczne tworzenie katalogu temp przy starcie

### Frontend (React + Vite)

- Tailwind CSS dla stylowania
- Brak zewnętrznego state management (tylko React useState/useEffect)
- LocalStorage dla trwałej konfiguracji dysków
- API calls przez fetch (bez axios)

### Obsługa błędów

- Backend zwraca JSON z polem `error` przy błędach
- Frontend wyświetla alerty dla użytkownika
- Pliki systemowe niedostępne (EPERM) są pomijane z logowaniem

### Nazewnictwo

- **snake-case** dla plików: `file-service.ts`, `drive-storage.ts`
- **PascalCase** dla komponentów React: `FileBrowser.tsx`
- **camelCase** dla funkcji i zmiennych

### Routing

| Ścieżka        | Cel                |
| -------------- | ------------------ |
| `/`            | Frontend React App |
| `/api/health`  | Health check       |
| `/api/files/*` | File operations    |

## Architektura Komponentów

```
App.tsx
├── DriveSelector.tsx (zakładki dysków)
│   └── Modal (konfiguracja lokalizacji)
├── Header
│   ├── Przycisk "Wskaż lokalizację" (warunkowo)
│   ├── CreateFolder.tsx (modal tworzenia folderu)
│   └── Przycisk "Odśwież"
└── Main
    ├── FileUploader.tsx (drag & drop + file picker)
    └── FileBrowser.tsx (tabela plików)
        └── FileActions.tsx (panel akcji: przenieś/kopiuj/usuń)
            └── Modal (wybór folderu docelowego)
```

### Przepływ danych

**Przeglądanie plików:**

1. User wybiera dysk → `DriveSelector` → `App.setState(currentPath)`
2. `FileBrowser` wywołuje `fileApi.browseDirectory(path)`
3. Backend `GET /api/files/browse` → `FileService.browseDirectory()`
4. Zwraca `BrowseResponse` → Renderowanie tabeli

**Upload plików:**

1. User przeciąga pliki → `FileUploader` → `files` state
2. Klik "Prześlij" → `fileApi.uploadFiles(files, targetDir)`
3. Backend `POST /api/files/upload` → Multer → temp folder
4. Backend przenosi z temp do `targetDir` → Zwraca sukces
5. Frontend odświeża `FileBrowser`

**Przenoszenie plików:**

1. User zaznacza pliki (Ctrl+Click) → `selectedFiles` state
2. Klik "Przenieś" → `FileActions` otwiera modal
3. User nawiguje i wybiera folder → `targetPath` state
4. Klik "Przenieś tutaj" → API calls w pętli dla każdego pliku
5. Backend `POST /api/files/move` → fs.move()
6. Frontend odświeża `FileBrowser`

## Kontakt z Kierownikiem

Przy wątpliwościach zawsze pytaj kierownika projektu przed implementacją.
