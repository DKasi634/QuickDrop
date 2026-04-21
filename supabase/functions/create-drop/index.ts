// ============================================================
// Quick-Share Drops - Create Drop Edge Function
// Validates anonymous drop creation server-side, stores metadata,
// and uploads image content into the private quick-drops bucket.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('PROJECT_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const MAX_CAPTION_CHARS = 200;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);

type ContentType = 'image' | 'text';
type ExpiryOption = '1h' | '24h' | '7d' | '1view';

interface CreatePayload {
  contentType: ContentType;
  expiry: ExpiryOption;
  caption: string | null;
  textContent: string | null;
  imageFile: File | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const payload = await parsePayload(req);
    const validationError = validatePayload(payload);
    if (validationError) return json({ error: validationError }, 400);

    const result = await createDrop(payload);
    return json({ drop: result }, 201);
  } catch (err) {
    console.error('create-drop function error:', err);
    return json({ error: 'Unexpected error' }, 500);
  }
});

async function parsePayload(req: Request): Promise<CreatePayload> {
  const form = await req.formData();
  const contentType = String(form.get('content_type') || '') as ContentType;
  const expiry = String(form.get('expiry') || '') as ExpiryOption;
  const captionValue = form.get('caption');
  const textValue = form.get('text_content');
  const fileValue = form.get('image');

  return {
    contentType,
    expiry,
    caption: typeof captionValue === 'string' && captionValue.trim()
      ? captionValue.trim()
      : null,
    textContent: typeof textValue === 'string' ? textValue.trim() : null,
    imageFile: fileValue instanceof File ? fileValue : null,
  };
}

function validatePayload(payload: CreatePayload): string | null {
  if (payload.contentType !== 'image' && payload.contentType !== 'text') {
    return 'Unsupported drop type.';
  }

  if (!['1h', '24h', '7d', '1view'].includes(payload.expiry)) {
    return 'Unsupported expiry option.';
  }

  if (payload.caption && payload.caption.length > MAX_CAPTION_CHARS) {
    return `Captions must be ${MAX_CAPTION_CHARS} characters or less.`;
  }

  if (payload.contentType === 'text') {
    if (!payload.textContent) return 'Text drops cannot be empty.';
    if (payload.textContent.length > MAX_TEXT_CHARS) {
      return `Text drops must be ${MAX_TEXT_CHARS} characters or less.`;
    }
    return null;
  }

  if (!payload.imageFile) return 'Choose an image to drop.';
  if (!ALLOWED_IMAGE_TYPES.has(payload.imageFile.type)) {
    return 'Images must be PNG, JPG, GIF, or WebP.';
  }
  if (payload.imageFile.size > MAX_IMAGE_BYTES) {
    return 'Images must be 10 MB or smaller.';
  }

  return null;
}

async function createDrop(payload: CreatePayload) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const dropCode = generateDropCode();
    const expiresAt = calculateExpiresAt(payload.expiry);
    const viewLimit = payload.expiry === '1view' ? 1 : null;
    const filePath = await uploadImageIfNeeded(payload, dropCode);

    const { data, error } = await supabaseAdmin
      .from('drops')
      .insert({
        drop_code: dropCode,
        file_path: filePath,
        content_type: payload.contentType,
        text_content: payload.contentType === 'text' ? payload.textContent : null,
        caption: payload.caption,
        expires_at: expiresAt,
        view_limit: viewLimit,
      })
      .select('id')
      .single();

    if (!error && data) {
      return {
        id: data.id,
        dropCode,
        expiresAt,
        viewLimit,
      };
    }

    if (filePath) {
      await supabaseAdmin.storage.from('quick-drops').remove([filePath]);
    }

    if (error?.code !== '23505') {
      console.error('Drop insert failed:', error);
      throw new Error(error?.message || 'Drop insert failed');
    }
  }

  throw new Error('Could not generate a unique drop code');
}

async function uploadImageIfNeeded(
  payload: CreatePayload,
  dropCode: string
): Promise<string | null> {
  if (payload.contentType !== 'image' || !payload.imageFile) return null;

  const ext = ALLOWED_IMAGE_TYPES.get(payload.imageFile.type) || 'png';
  const filePath = `drops/${dropCode}.${ext}`;
  const imageBytes = await payload.imageFile.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from('quick-drops')
    .upload(filePath, imageBytes, {
      contentType: payload.imageFile.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload failed:', error);
    throw new Error(error.message);
  }

  return filePath;
}

function calculateExpiresAt(expiry: ExpiryOption): string {
  const now = new Date();
  switch (expiry) {
    case '1h':
      now.setHours(now.getHours() + 1);
      break;
    case '24h':
      now.setHours(now.getHours() + 24);
      break;
    case '7d':
      now.setDate(now.getDate() + 7);
      break;
    case '1view':
      now.setDate(now.getDate() + 30);
      break;
  }
  return now.toISOString();
}

const ADJECTIVES = [
  'amber', 'azure', 'bold', 'brave', 'bright', 'calm', 'clever', 'cool',
  'cozy', 'crisp', 'dapper', 'dawn', 'deep', 'eager', 'early', 'epic',
  'fair', 'fancy', 'fast', 'fiery', 'fleet', 'fresh', 'frost', 'gentle',
  'glad', 'gleam', 'glow', 'golden', 'grand', 'great', 'happy', 'hazy',
  'icy', 'jade', 'jolly', 'keen', 'kind', 'lava', 'lazy', 'light',
  'lively', 'lucky', 'lunar', 'magic', 'merry', 'misty', 'neon', 'noble',
  'opal', 'pale', 'pearl', 'plush', 'prime', 'proud', 'pure', 'quick',
  'quiet', 'rapid', 'rare', 'rich', 'rosy', 'royal', 'ruby', 'rusty',
  'sage', 'shiny', 'silk', 'sleek', 'slick', 'solar', 'sonic', 'spicy',
  'stark', 'steel', 'stone', 'storm', 'sunny', 'super', 'sweet', 'swift',
  'tall', 'teal', 'tidy', 'tiny', 'topaz', 'ultra', 'vast', 'vivid',
  'warm', 'wavy', 'wild', 'wise', 'witty', 'young', 'zany', 'zen',
  'zippy', 'coral', 'dusky', 'fern',
];

const NOUNS = [
  'ace', 'arch', 'atom', 'bass', 'bay', 'bear', 'bee', 'bird',
  'bolt', 'bone', 'brook', 'byte', 'cape', 'cave', 'clay', 'cliff',
  'cloud', 'comet', 'core', 'crab', 'crow', 'cube', 'dart', 'deer',
  'dome', 'dove', 'dune', 'dust', 'echo', 'edge', 'elk', 'ember',
  'fawn', 'fern', 'fire', 'fish', 'flair', 'flame', 'flare', 'flux',
  'fog', 'forge', 'fox', 'frog', 'gem', 'glen', 'glow', 'goat',
  'gust', 'hare', 'hawk', 'haze', 'hill', 'hive', 'horn', 'ibis',
  'iris', 'isle', 'jade', 'jay', 'jest', 'jewel', 'kite', 'lake',
  'lark', 'leaf', 'lens', 'lily', 'lion', 'loft', 'lynx', 'mace',
  'maple', 'marsh', 'mesa', 'mist', 'moon', 'moss', 'moth', 'nest',
  'nova', 'oak', 'opal', 'orca', 'orb', 'owl', 'palm', 'peak',
  'pine', 'plum', 'pond', 'puma', 'quail', 'rain', 'raven', 'reed',
  'reef', 'ridge', 'river', 'robin', 'rock', 'rose', 'rust', 'sage',
];

function generateDropCode(): string {
  const adj = ADJECTIVES[randomIndex(ADJECTIVES.length)];
  const noun = NOUNS[randomIndex(NOUNS.length)];
  const num = randomInt(10, 99);
  return `${adj}-${noun}-${num}`;
}

function randomIndex(length: number): number {
  return randomInt(0, length - 1);
}

function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return min + (bytes[0] % range);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
