import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';

export interface PhotoUploadOptions {
  maxSizeMB?: number;        // Default: 5MB
  allowedTypes?: string[];   // Default: jpg, png, gif, webp
}

const IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif', // iPhone native format
];

/**
 * Compress an image file using standard <canvas> for mobile compatibility.
 * Returns a JPEG under maxBytes, or the original if already small enough.
 */
async function compressProfilePhoto(file: File, maxBytes = 900_000): Promise<File> {
  // Skip non-images or already-small files
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file;

  // Load via <img> (works on all browsers including iOS Safari)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });

  const MAX_DIM = 1200; // Profile photos don't need to be huge
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  const toBlob = (q: number): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', q)
    );

  for (let quality = 0.85; quality >= 0.3; quality -= 0.1) {
    const blob = await toBlob(quality);
    if (blob.size <= maxBytes || quality <= 0.3) {
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
    }
  }

  const blob = await toBlob(0.3);
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

/**
 * Upload profile photo to the Express backend → S3
 * Returns the full CDN URL of the uploaded photo.
 * Automatically compresses large images for mobile compatibility.
 */
export async function uploadProfilePhoto(
  _userId: string,
  personId: string,
  file: File,
  oldPhotoUrl?: string | null,
  options?: PhotoUploadOptions
): Promise<string> {
  // 1. Validate file type (allow empty type for HEIC on some browsers)
  const allowedTypes = options?.allowedTypes || IMAGE_TYPES;
  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image.');
  }

  // 2. Compress before upload (handles large mobile photos + nginx body limits)
  const processed = await compressProfilePhoto(file);

  // 3. Upload via Express backend → S3
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('photo', processed);
  formData.append('personId', personId);

  const res = await fetch(`${API_BASE_URL}/upload/photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Upload failed: ${err.error || res.statusText}`);
  }

  const { url } = await res.json();

  // 4. Delete old photo (works for both CDN URLs and legacy /uploads/ paths)
  if (oldPhotoUrl && (oldPhotoUrl.startsWith('/uploads/') || oldPhotoUrl.startsWith('http'))) {
    deleteProfilePhoto(oldPhotoUrl).catch((e) =>
      console.warn('Failed to delete old photo:', e)
    );
  }

  return url;
}

/**
 * Delete profile photo via the Express backend (handles both S3 and legacy local files)
 */
export async function deleteProfilePhoto(filePath: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/upload/photo`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ filePath }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Delete failed: ${err.error || res.statusText}`);
  }
}
