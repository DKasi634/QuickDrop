import './style.css';
import { fetchAndDisplayDrop } from './viewer';
import { startCountdown } from './countdown';

document.addEventListener('DOMContentLoaded', async () => {
  const pathMatch = window.location.pathname.match(/\/drop\/([a-z0-9-]+)/i);
  const params = new URLSearchParams(window.location.search);
  const dropCode = pathMatch?.[1] || params.get('code');

  if (!dropCode) {
    showExpired(
      'Viewer ready',
      'Create a drop from the browser extension, then open the generated share link here.'
    );
    return;
  }

  try {
    const drop = await fetchAndDisplayDrop(dropCode);
    if (!drop) {
      showExpired();
      return;
    }
    document.title = `Quick Drop — ${drop.content_type === 'image' ? '🖼' : '📝'}`;
    if (drop.expires_at) startCountdown(drop.expires_at);
  } catch (err) {
    showExpired('Error', 'Failed to load drop.');
  }
});

function showExpired(title?: string, message?: string): void {
  document.getElementById('loading-state')?.classList.add('hidden');
  document.getElementById('content-state')?.classList.add('hidden');
  document.getElementById('expired-state')?.classList.remove('hidden');

  if (title) {
    const titleEl = document.getElementById('expired-title');
    if (titleEl) titleEl.textContent = title;
  }
  if (message) {
    const msgEl = document.getElementById('expired-message');
    if (msgEl) msgEl.textContent = message;
  }
}
