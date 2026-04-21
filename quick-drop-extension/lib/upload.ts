import { getSupabaseClient, VIEWER_BASE_URL } from './supabase';
import { generateDropCode } from './link-generator';
import type { DropPayload, DropResult, ExpiryOption } from './types';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const MAX_CAPTION_CHARS = 200;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function calculateExpiresAt(expiry: ExpiryOption): string {
  const now = new Date();
  switch (expiry) {
    case '1h': now.setHours(now.getHours() + 1); break;
    case '24h': now.setHours(now.getHours() + 24); break;
    case '7d': now.setDate(now.getDate() + 7); break;
    case '1view': now.setDate(now.getDate() + 30); break;
  }
  return now.toISOString();
}

function getViewLimit(expiry: ExpiryOption): number | null {
  return expiry === '1view' ? 1 : null;
}

export async function uploadDrop(payload: DropPayload): Promise<DropResult> {
  validatePayload(payload);

  const client = getSupabaseClient();
  const dropCode = generateDropCode();
  const expiresAt = calculateExpiresAt(payload.expiry);
  const viewLimit = getViewLimit(payload.expiry);

  let filePath: string | null = null;

  if (payload.contentType === 'image' && payload.imageBlob) {
    const ext = getFileExtension(payload.fileName || 'image.png');
    filePath = `drops/${dropCode}.${ext}`;

    const { error: uploadError } = await client.storage
      .from('quick-drops')
      .upload(filePath, payload.imageBlob, {
        contentType: payload.imageBlob.type || 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await client
    .from('drops')
    .insert({
      drop_code: dropCode,
      file_path: filePath,
      content_type: payload.contentType,
      text_content: payload.contentType === 'text' ? payload.textContent : null,
      caption: payload.caption || null,
      expires_at: expiresAt,
      view_limit: viewLimit,
    });

  if (insertError) {
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  return {
    id: dropCode,
    dropCode,
    shareUrl: `${VIEWER_BASE_URL}/drop/${dropCode}`,
    expiresAt,
    viewLimit: viewLimit ?? undefined,
  };
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'png';
  if (ext === 'jpg' || ext === 'jpeg') return ext;
  if (ext === 'png' || ext === 'gif' || ext === 'webp') return ext;
  return 'png';
}

function validatePayload(payload: DropPayload): void {
  if (payload.caption && payload.caption.length > MAX_CAPTION_CHARS) {
    throw new Error(`Captions must be ${MAX_CAPTION_CHARS} characters or less.`);
  }

  if (payload.contentType === 'text') {
    const text = payload.textContent?.trim();
    if (!text) throw new Error('Text drops cannot be empty.');
    if (text.length > MAX_TEXT_CHARS) {
      throw new Error(`Text drops must be ${MAX_TEXT_CHARS} characters or less.`);
    }
    return;
  }

  if (payload.contentType === 'image') {
    if (!payload.imageBlob) throw new Error('Choose an image to drop.');
    if (!ALLOWED_IMAGE_TYPES.has(payload.imageBlob.type)) {
      throw new Error('Images must be PNG, JPG, GIF, or WebP.');
    }
    if (payload.imageBlob.size > MAX_IMAGE_BYTES) {
      throw new Error('Images must be 10 MB or smaller.');
    }
  }
}

export async function createThumbnail(
  blob: Blob,
  maxSize = 80
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.6));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Thumbnail load failed'));
    };

    img.src = url;
  });
}
