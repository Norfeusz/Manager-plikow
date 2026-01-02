// Shared TypeScript types

export type FileType = 'image' | 'video' | 'other' | 'directory';

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  exifDate?: string;
  type: FileType;
  isDirectory: boolean;
}

export interface Drive {
  id: string;
  name: string;
  path: string;
  available: boolean;
}

export interface DriveConfig {
  id: string;
  name: string;
  defaultPath?: string;
  customPath?: string;
  needsConfiguration: boolean;
  isGoogleDrive?: boolean;
  googleDriveFolderId?: string;
}

export interface DuplicateInfo {
  original: FileMetadata;
  duplicate: FileMetadata;
  confidence: number;
}

export interface BrowseRequest {
  path: string;
  driveId?: string;
}

export interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  items: FileMetadata[];
}

export interface ExifData {
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  make?: string;
  model?: string;
  orientation?: number;
  width?: number;
  height?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  lens?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
}

export interface OrganizePhotosResult {
  processed: number;
  moved: number;
  skipped: number;
  errors: string[];
}
