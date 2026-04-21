import { SUPABASE_ANON_KEY, SUPABASE_URL, VIEWER_BASE_URL } from './supabase';
import type { DropPayload, DropResult } from './types';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const MAX_CAPTION_CHARS = 200;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

interface CreateDropResponse {
  drop?: {
    id: string;
    dropCode: string;
    expiresAt: string;
    viewLimit: number | null;
  };
  error?: string;
}

export async function uploadDrop(payload: DropPayload): Promise<DropResult> {
  validatePayload(payload);

  const form = new FormData();
  form.set('content_type', payload.contentType);
  form.set('expiry', payload.expiry);
  form.set('caption', payload.caption || '');

  if (payload.contentType === 'text') {
    form.set('text_content', payload.textContent?.trim() || '');
  } else if (payload.imageBlob) {
    form.set('image', payload.imageBlob, payload.fileName || 'quick-drop-image.png');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-drop`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: form,
  });

  const body = (await response.json().catch(() => ({}))) as CreateDropResponse;

  if (!response.ok || !body.drop) {
    throw new Error(body.error || `Drop creation failed (${response.status})`);
  }

  return {
    id: body.drop.id,
    dropCode: body.drop.dropCode,
    shareUrl: `${VIEWER_BASE_URL}/drop/${body.drop.dropCode}`,
    expiresAt: body.drop.expiresAt,
    viewLimit: body.drop.viewLimit ?? undefined,
  };
}

function validatePayload(payload: DropPayload): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

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
