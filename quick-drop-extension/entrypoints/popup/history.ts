import type { AppController } from './app';
import { getDropHistory, clearHistory, removeDrop } from '../../lib/storage';
import { deleteRemoteDrop } from '../../lib/remote-drops';

export function initHistory(app: AppController): void {
  const historyView = document.getElementById('view-history')!;

  app.on('history:show', () => {
    renderHistory();
  });

  async function renderHistory(): Promise<void> {
    const drops = await getDropHistory();

    if (drops.length === 0) {
      historyView.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon">📭</div>
          <div class="history-empty-text">No drops yet. Create your first one!</div>
        </div>
      `;
      return;
    }

    const now = Date.now();
    const itemsHtml = drops.map((drop) => {
      const isExpired = new Date(drop.expiresAt).getTime() <= now;
      const timeLeft = isExpired ? 'Expired' : formatTimeRemaining(drop.expiresAt);
      const expiredClass = isExpired ? 'expired' : '';
      const thumbHtml = drop.thumbnailDataUrl
        ? `<div class="history-thumb"><img src="${drop.thumbnailDataUrl}" alt="Thumbnail" /></div>`
        : `<div class="history-thumb">${drop.contentType === 'image' ? '🖼' : '📝'}</div>`;

      return `
        <div class="history-item ${expiredClass}" data-drop-id="${drop.id}">
          ${thumbHtml}
          <div class="history-info">
            <div class="history-code">${escapeHtml(drop.dropCode)}</div>
            <div class="history-meta">
              ${drop.contentType === 'image' ? '🖼' : '📝'} •
              ${timeLeft}
              ${drop.caption ? ` • "${truncate(drop.caption, 20)}"` : ''}
            </div>
          </div>
          <div class="history-actions">
            ${!isExpired ? `<button class="history-btn btn-history-copy" data-url="${escapeHtml(drop.shareUrl)}" title="Copy link">📋</button>` : ''}
            ${drop.creatorToken ? `<button class="history-btn btn-history-delete-remote" data-id="${drop.id}" title="Delete drop now">🗑</button>` : ''}
            <button class="history-btn btn-history-remove" data-id="${drop.id}" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join('');

    historyView.innerHTML = `
      <div class="history-header">
        <span class="history-title">Recent Drops (${drops.length})</span>
        <button class="btn-clear-history" id="btn-clear-history">Clear All</button>
      </div>
      <div class="history-list">${itemsHtml}</div>
    `;

    attachHistoryListeners();
  }

  function attachHistoryListeners(): void {
    historyView.querySelectorAll('.btn-history-copy').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = (btn as HTMLElement).dataset.url;
        if (url) {
          try {
            await navigator.clipboard.writeText(url);
            const orig = btn.textContent;
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = orig; }, 1500);
          } catch {
            app.showError('Failed to copy link.');
          }
        }
      });
    });

    historyView.querySelectorAll('.btn-history-remove').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          await removeDrop(id);
          const item = (btn as HTMLElement).closest('.history-item') as HTMLElement;
          if (item) {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(50px)';
            setTimeout(() => renderHistory(), 350);
          } else {
            renderHistory();
          }
        }
      });
    });

    historyView.querySelectorAll('.btn-history-delete-remote').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;

        const drops = await getDropHistory();
        const drop = drops.find((item) => item.id === id);
        if (!drop?.creatorToken) {
          app.showError('Missing creator token for this drop.');
          return;
        }

        if (!confirm('Delete this drop for everyone now?')) return;

        (btn as HTMLButtonElement).disabled = true;

        try {
          await deleteRemoteDrop(drop.dropCode, drop.creatorToken);
          await removeDrop(id);
          const item = (btn as HTMLElement).closest('.history-item') as HTMLElement;
          if (item) {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(50px)';
            setTimeout(() => renderHistory(), 350);
          } else {
            renderHistory();
          }
        } catch (err) {
          (btn as HTMLButtonElement).disabled = false;
          app.showError(err instanceof Error ? err.message : 'Delete failed.');
        }
      });
    });

    const btnClear = document.getElementById('btn-clear-history');
    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        if (confirm('Clear all drop history?')) {
          await clearHistory();
          renderHistory();
        }
      });
    }

    historyView.querySelectorAll('.history-item:not(.expired)').forEach((item) => {
      item.addEventListener('click', () => {
        const copyBtn = item.querySelector('.btn-history-copy') as HTMLElement;
        const url = copyBtn?.dataset.url;
        if (url) window.open(url, '_blank');
      });
      (item as HTMLElement).style.cursor = 'pointer';
    });
  }
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const minutes = Math.floor(diff / (1000 * 60));
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return `${minutes}m left`;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
