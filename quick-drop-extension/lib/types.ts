export type ContentType = 'image' | 'text';
export type ExpiryOption = '1h' | '24h' | '7d' | '1view';

export interface LocalDrop {
  id: string;
  dropCode: string;
  contentType: ContentType;
  shareUrl: string;
  expiresAt: string;
  viewLimit?: number;
  caption?: string;
  createdAt: string;
  thumbnailDataUrl?: string;
  creatorToken?: string;
}

export interface SupabaseDrop {
  id: string;
  drop_code: string;
  file_path: string | null;
  content_type: ContentType;
  text_content: string | null;
  caption: string | null;
  expires_at: string;
  view_limit: number | null;
  views_count: number;
  created_at: string;
}

export interface DropPayload {
  contentType: ContentType;
  imageBlob?: Blob;
  fileName?: string;
  textContent?: string;
  expiry: ExpiryOption;
  caption?: string;
}

export interface DropResult {
  id: string;
  dropCode: string;
  shareUrl: string;
  expiresAt: string;
  viewLimit?: number;
  creatorToken?: string;
}

export type ExtensionMessage =
  | { type: 'CONTEXT_MENU_IMAGE'; imageUrl: string }
  | { type: 'CONTEXT_MENU_TEXT'; text: string }
  | { type: 'DROP_CREATED'; drop: DropResult };
