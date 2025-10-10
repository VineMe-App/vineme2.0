import { supabase } from './supabase';

// Conditionally import FileSystem - not available in Expo Go
// Using try-catch to gracefully handle when the module isn't available
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch (error) {
  // FileSystem not available (likely Expo Go) - will be handled at runtime
  console.log('[GroupMediaService] expo-file-system not available - some features will be disabled');
}

export interface GroupMediaResponse<T = any> {
  data: T | null;
  error: Error | null;
}

interface UploadOptions {
  groupId?: string;
  uploaderId?: string;
}

const GROUP_IMAGE_BUCKET = 'group-images';

function inferFileExtension(uri: string, fallback: string = 'jpg') {
  const cleaned = uri.split('?')[0];
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    return parts.pop() || fallback;
  }
  return fallback;
}

function inferContentType(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToUint8Array(base64: string): Uint8Array {
  const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const paddingMatch = sanitized.match(/=+$/);
  const paddingLength = paddingMatch ? paddingMatch[0].length : 0;
  const byteLength = Math.floor((sanitized.length * 3) / 4) - paddingLength;
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  for (let i = 0; i < sanitized.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(sanitized[i]);
    const enc2 = BASE64_CHARS.indexOf(sanitized[i + 1]);
    const enc3 = BASE64_CHARS.indexOf(sanitized[i + 2]);
    const enc4 = BASE64_CHARS.indexOf(sanitized[i + 3]);

    const chunk =
      (enc1 << 18) |
      (enc2 << 12) |
      ((enc3 & 63) << 6) |
      (enc4 & 63);

    if (byteIndex < byteLength) {
      bytes[byteIndex++] = (chunk >> 16) & 0xff;
    }
    if (enc3 !== 64 && byteIndex < byteLength) {
      bytes[byteIndex++] = (chunk >> 8) & 0xff;
    }
    if (enc4 !== 64 && byteIndex < byteLength) {
      bytes[byteIndex++] = chunk & 0xff;
    }
  }

  return bytes;
}

class GroupMediaService {
  async uploadGroupImage(
    localUri: string,
    options: UploadOptions = {}
  ): Promise<GroupMediaResponse<string>> {
    try {
      // Check if FileSystem is available (not in Expo Go)
      if (!FileSystem) {
        console.warn('[uploadGroupImage] FileSystem not available - running in Expo Go');
        return {
          data: null,
          error: new Error('Image upload requires a development build. This feature is not available in Expo Go.'),
        };
      }

      const fileInfo = await FileSystem.getInfoAsync(localUri, {
        size: true,
      });

      if (!fileInfo.exists || fileInfo.isDirectory) {
        return {
          data: null,
          error: new Error('Selected image could not be accessed.'),
        };
      }

      const fileExt = inferFileExtension(localUri, 'jpg');
      const contentType = inferContentType(fileExt);

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileBytes = base64ToUint8Array(base64);

      const fileNameParts = [
        options.groupId || 'group',
        options.uploaderId || 'user',
        Date.now().toString(),
      ];
      const fileName = `${fileNameParts.filter(Boolean).join('-')}.${fileExt}`;
      const directory = options.groupId
        ? `groups/${options.groupId}`
        : `pending/${options.uploaderId || 'anonymous'}`;
      const filePath = `${directory}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(GROUP_IMAGE_BUCKET)
        .upload(filePath, fileBytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        return { data: null, error: new Error(uploadError.message) };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(GROUP_IMAGE_BUCKET).getPublicUrl(filePath);

      return { data: publicUrl, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to upload group image'),
      };
    }
  }
}

export const groupMediaService = new GroupMediaService();
