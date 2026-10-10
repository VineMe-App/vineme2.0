import { Platform, Share } from 'react-native';

// Conditionally import FileSystem - not available in Expo Go
// Using legacy API for StorageAccessFramework (Android folder picker)
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (error) {
  console.log(
    '[saveTextFiles] expo-file-system not available - file saving will be disabled'
  );
}

export interface TextFile {
  filename: string;
  content: string;
  mimeType?: string;
}

/**
 * Saves text files (e.g. CSV exports) to the user's device:
 *  - Web: triggers a browser download for each file.
 *  - Android: asks the user to pick a folder, then writes each file into it.
 *  - iOS: writes each file to the cache and opens the share sheet ("Save to Files").
 *
 * Returns false if the user cancelled (e.g. declined the Android folder picker).
 */
export async function saveTextFiles(files: TextFile[]): Promise<boolean> {
  if (Platform.OS === 'web') {
    files.forEach(downloadOnWeb);
    return true;
  }

  if (!FileSystem) {
    throw new Error('Saving files is not supported in this build of the app.');
  }

  if (Platform.OS === 'android') {
    const saf = FileSystem.StorageAccessFramework;
    const permissions = await saf.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return false;

    for (const file of files) {
      const uri = await saf.createFileAsync(
        permissions.directoryUri,
        file.filename.replace(/\.[^.]+$/, ''),
        file.mimeType ?? 'text/csv'
      );
      await FileSystem.writeAsStringAsync(uri, file.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
    return true;
  }

  for (const file of files) {
    const uri = `${FileSystem.cacheDirectory}${file.filename}`;
    await FileSystem.writeAsStringAsync(uri, file.content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Share.share({ url: uri, title: file.filename });
  }
  return true;
}

function downloadOnWeb(file: TextFile) {
  const blob = new Blob([file.content], {
    type: `${file.mimeType ?? 'text/csv'};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
