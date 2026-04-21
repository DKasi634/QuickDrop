import { triggerSelfDestruct } from './self-destruct';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface DropData {
  drop_code: string;
  content_type: 'image' | 'text';
  text_content: string | null;
  caption: string | null;
  expires_at: string;
  view_limit: number | null;
  views_count: number;
  signed_url: string | null;
  file_name: string | null;
}

export async function fetchAndDisplayDrop(dropCode: string): Promise<DropData | null> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/consume-drop?code=${encodeURIComponent(dropCode)}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error('Drop not found or expired:', response.status);
    return null;
  }

  const body = (await response.json()) as { drop?: DropData };
  const dropData = body.drop;

  if (!dropData || new Date(dropData.expires_at).getTime() <= Date.now()) {
    return null;
  }

  renderContent(dropData);

  document.getElementById('loading-state')?.classList.add('hidden');
  document.getElementById('content-state')?.classList.remove('hidden');

  if (dropData.view_limit !== null && dropData.views_count >= dropData.view_limit) {
    setTimeout(() => {
      triggerSelfDestruct(() => {
        document.getElementById('content-state')?.classList.add('hidden');
        showExpiredWithMessage();
      });
    }, 30000);

    const countdown = document.getElementById('viewer-countdown');
    if (countdown) {
      countdown.innerHTML = '👁 <span>One-time view — save it now!</span>';
      countdown.classList.add('urgent');
    }
  }

  return dropData;
}

function renderContent(drop: DropData): void {
  const contentArea = document.getElementById('content-area')!;
  const downloadBtn = document.getElementById('btn-download')!;
  const typeBadge = document.getElementById('viewer-type-badge')!;
  const captionEl = document.getElementById('viewer-caption')!;

  if (drop.caption) {
    captionEl.textContent = `"${drop.caption}"`;
    captionEl.classList.remove('hidden');
  }

  if (drop.content_type === 'image') {
    typeBadge.textContent = '🖼 IMAGE';
    typeBadge.classList.add('type-image');
  } else {
    typeBadge.textContent = '📝 TEXT';
    typeBadge.classList.add('type-text');
  }

  if (drop.content_type === 'image' && drop.signed_url) {
    renderImage(drop, contentArea, downloadBtn);
  } else if (drop.content_type === 'text' && drop.text_content) {
    renderText(drop.text_content, contentArea, downloadBtn);
  }
}

function renderImage(
  drop: DropData,
  container: HTMLElement,
  downloadBtn: HTMLElement
): void {
  const img = document.createElement('img');
  img.src = drop.signed_url!;
  img.alt = drop.caption || 'Shared image';
  img.style.opacity = '0';
  img.style.transition = 'opacity 0.4s ease';
  img.onload = () => {
    img.style.opacity = '1';
  };
  container.appendChild(img);

  downloadBtn.classList.remove('hidden');
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = drop.signed_url!;
    a.download = drop.file_name || 'quick-drop-image';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function renderText(
  text: string,
  container: HTMLElement,
  downloadBtn: HTMLElement
): void {
  const textDiv = document.createElement('div');
  textDiv.className = 'viewer-text-content';
  textDiv.textContent = text;
  container.appendChild(textDiv);

  downloadBtn.classList.remove('hidden');
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quick-drop-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function showExpiredWithMessage(): void {
  const expiredState = document.getElementById('expired-state')!;
  expiredState.classList.remove('hidden');

  const messages = [
    { icon: '💥', title: 'Boom! Self-destructed', msg: 'This drop was set to self-destruct after viewing. Mission accomplished! 🕵️' },
    { icon: '🥷', title: 'Poof! Gone like a ninja', msg: 'One moment it was here, the next... vanished into the shadows.' },
    { icon: '🪄', title: 'Abracadabra!', msg: 'This content has performed its disappearing act. Encore? Create a new drop!' },
    { icon: '🌬️', title: 'Blown away...', msg: 'Like a dandelion in the wind, this drop has scattered into nothingness.' },
    { icon: '🕳️', title: 'Into the void', msg: 'This drop took a one-way trip into a digital black hole. No returns!' },
  ];

  const msg = messages[Math.floor(Math.random() * messages.length)];

  const iconEl = document.getElementById('expired-icon');
  const titleEl = document.getElementById('expired-title');
  const msgEl = document.getElementById('expired-message');

  if (iconEl) iconEl.textContent = msg.icon;
  if (titleEl) titleEl.textContent = msg.title;
  if (msgEl) msgEl.textContent = msg.msg;
}
