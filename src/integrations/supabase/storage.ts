import { supabase } from './client';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export function validateFile(file: File) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new FileValidationError(
      'Invalid file type. Please upload a PDF, PNG, or JPG file.'
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      'File too large. Please upload a file smaller than 5MB.'
    );
  }
}

export async function uploadFloorMap(file: File) {
  // Validate file before upload
  validateFile(file);

  const fileExt = file.name.split('.').pop();
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2);
  const fileName = `${timestamp}-${randomString}.${fileExt}`;
  const filePath = `floor-maps/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('inventory')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload file. Please try again.');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('inventory')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw error;
    }
    console.error('Storage error:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
}

export async function deleteFloorMap(filePath: string) {
  if (!filePath) return;

  // Extract the path from the public URL
  const url = new URL(filePath);
  const pathParts = url.pathname.split('/');
  const storagePath = pathParts.slice(pathParts.indexOf('storage') + 2).join('/');

  try {
    const { error } = await supabase.storage
      .from('inventory')
      .remove([storagePath]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete file. Please try again.');
    }
  } catch (error) {
    console.error('Storage error:', error);
    throw new Error('Failed to delete file. Please try again.');
  }
}