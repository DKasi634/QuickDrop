import { browser } from 'wxt/browser';
import type { AppController, LoadedContent } from './app';
import type { ExpiryOption } from '../../lib/types';
import { uploadDrop, createThumbnail } from '../../lib/upload';
import { saveDrop } from '../../lib/storage';
import { triggerConfetti } from './animations';

export function initPreview(app: AppController): void {
  const previewImageContainer = document.getElementById('preview-image-container')!;
  const previewImage = document.getElementById('preview-image') as HTMLImageElement;
  const previewTextContainer = document.getElementById('preview-text-container')!;
  const previewBadge = document.getElementById('preview-badge')!;
  const previewSize = document.getElementById('preview-size')!;
  const expiryOptions = document.getElementById('expiry-options')!;
  const btnDrop = document.getElementById('btn-drop') as HTMLButtonElement;
  const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;

  app.on('preview:load', (content: LoadedContent) => {
    renderPreview(content);
  });

  expiryOptions.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.expiry-btn') as HTMLElement;
    if (!btn) return;

    expiryOptions.querySelectorAll('.expiry-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    app.setExpiry(btn.dataset.expiry as ExpiryOption);
  });

  btnCancel.addEventListener('click', () => {
    cleanupPreview();
    app.emit('reset');
  });

  btnDrop.addEventListener('click', async () => {
    const content = app.getContent();
    if (!content) return;

    btnDrop.disabled = true;
    app.setUploading(true);

    try {
      const result = await uploadDrop({
        contentType: content.contentType,
        imageBlob: content.imageBlob,
        fileName: content.fileName,
        textContent: content.textContent,
        expiry: app.getExpiry(),
        caption: app.getCaption(),
      });

      let thumbnailDataUrl: string | undefined;
      if (content.contentType === 'image' && content.imageBlob) {
        try {
          thumbnailDataUrl = await createThumbnail(content.imageBlob);
        } catch {}
      }

      await saveDrop({
        id: result.id,
        dropCode: result.dropCode,
        contentType: content.contentType,
        shareUrl: result.shareUrl,
        expiresAt: result.expiresAt,
        viewLimit: result.viewLimit,
        caption: app.getCaption() || undefined,
        createdAt: new Date().toISOString(),
        thumbnailDataUrl,
      });

      app.setUploading(false);
      triggerConfetti();
      app.showShareResult(result);

      try {
        await browser.notifications.create({
          type: 'basic',
          iconUrl: '/icon/icon-128.png',
          title: 'Drop launched! 🪂',
          message: `Your ${content.contentType} drop is live. Link copied!`,
        });
      } catch {}

      cleanupPreview();
    } catch (err) {
      app.setUploading(false);
      app.showError(err instanceof Error ? err.message : 'Upload failed.');
      btnDrop.disabled = false;
    }
  });

  function renderPreview(content: LoadedContent): void {
    previewImageContainer.classList.add('hidden');
    previewTextContainer.classList.add('hidden');

    if (content.contentType === 'image' && content.imageBlob) {
      const url = URL.createObjectURL(content.imageBlob);
      previewImage.src = url;
      previewImage.onload = () => {
        previewImageContainer.classList.remove('hidden');
      };

      previewBadge.textContent = '🖼 IMAGE';
      previewBadge.className = 'badge badge-image';

      const sizeKB = Math.round(content.imageBlob.size / 1024);
      previewSize.textContent = `${sizeKB} KB • ${content.fileName || 'image'}`;
    } else if (content.contentType === 'text' && content.textContent) {
      previewTextContainer.textContent = content.textContent;
      previewTextContainer.classList.remove('hidden');

      previewBadge.textContent = '📝 TEXT';
      previewBadge.className = 'badge badge-text';

      const charCount = content.textContent.length;
      previewSize.textContent = `${charCount} chars`;
    }

    expiryOptions.querySelectorAll('.expiry-btn').forEach((b) => {
      b.classList.remove('active');
      if ((b as HTMLElement).dataset.expiry === '24h') {
        b.classList.add('active');
      }
    });
    app.setExpiry('24h');

    btnDrop.disabled = false;
  }

  function cleanupPreview(): void {
    if (previewImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage.src);
    }
    previewImage.src = '';
    previewTextContainer.textContent = '';
  }
}
