import type { AppController } from './app';
import type { DropResult } from '../../lib/types';
import QRCode from 'qrcode';

export function initShareResult(app: AppController): void {
  const shareView = document.getElementById('view-share')!;

  app.on('share:show', async (result: DropResult) => {
    shareView.innerHTML = renderShareCard(result);

    const qrContainer = document.getElementById('qr-canvas-container');
    if (qrContainer) {
      try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, result.shareUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#e2e8f0', light: '#1a1a24' },
        });
        qrContainer.appendChild(canvas);
      } catch (err) {
        qrContainer.innerHTML = '<span style="font-size:11px;color:#64748b;">QR unavailable</span>';
      }
    }

    const btnCopy = document.getElementById('btn-copy-link');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.shareUrl);
          btnCopy.textContent = '✓ Copied!';
          btnCopy.classList.add('copied');
          setTimeout(() => {
            btnCopy.textContent = 'Copy';
            btnCopy.classList.remove('copied');
          }, 2000);
        } catch {
          const urlSpan = document.getElementById('share-url');
          if (urlSpan) {
            const range = document.createRange();
            range.selectNodeContents(urlSpan);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      });
    }

    const btnNewDrop = document.getElementById('btn-new-drop');
    if (btnNewDrop) {
      btnNewDrop.addEventListener('click', () => {
        app.emit('reset');
      });
    }

    try {
      await navigator.clipboard.writeText(result.shareUrl);
    } catch {}
  });
}

function renderShareCard(result: DropResult): string {
  const expiryDate = new Date(result.expiresAt);
  const expiryText = result.viewLimit
    ? `Self-destructs after ${result.viewLimit} view`
    : `Expires ${formatRelativeTime(expiryDate)}`;

  return `
    <div class="share-card">
      <div class="share-success-icon">🪂</div>
      <div class="share-title">Drop Launched!</div>
      <div class="share-subtitle">Your link is ready — already copied to clipboard</div>

      <div class="share-link-box">
        <span class="share-link-url" id="share-url">${escapeHtml(result.shareUrl)}</span>
        <button class="btn-copy" id="btn-copy-link">Copy</button>
      </div>

      <div class="share-qr">
        <div id="qr-canvas-container"></div>
        <span class="share-qr-label">Scan to open on phone</span>
      </div>

      <div class="share-expiry-info">
        <span>⏱</span>
        <span>${expiryText}</span>
      </div>

      <button class="btn-new-drop" id="btn-new-drop">+ New Drop</button>
    </div>
  `;
}

function formatRelativeTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'already';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
