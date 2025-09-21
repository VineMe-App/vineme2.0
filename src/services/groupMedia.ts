import { supabase } from './supabase';

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

class GroupMediaService {
  async uploadGroupImage(
    localUri: string,
    options: UploadOptions = {}
  ): Promise<GroupMediaResponse<string>> {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const fileExt = inferFileExtension(localUri, 'jpg');
      const fileNameParts = [
        options.groupId || 'group',
        options.uploaderId || 'user',
        Date.now().toString(),
      ];
      const fileName = `${fileNameParts.filter(Boolean).join('-')}.${fileExt}`;
      const filePath = `${GROUP_IMAGE_BUCKET}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(GROUP_IMAGE_BUCKET)
        .upload(filePath, blob, { upsert: true });

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
