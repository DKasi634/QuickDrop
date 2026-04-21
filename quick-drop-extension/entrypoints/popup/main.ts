import '../../assets/style.css';
import { browser } from 'wxt/browser';
import { initDropZone } from './drop-zone';
import { initPreview } from './preview';
import { initShareResult } from './share-result';
import { initHistory } from './history';
import { initApp } from './app';
import type { ExtensionMessage } from '../../lib/types';

type PendingDrop =
  | { type: 'CONTEXT_MENU_IMAGE'; imageUrl: string }
  | { type: 'CONTEXT_MENU_TEXT'; text: string };

document.addEventListener('DOMContentLoaded', async () => {
  const app = initApp();
  initDropZone(app);
  initPreview(app);
  initShareResult(app);
  initHistory(app);

  await loadPendingDrop(app);

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'CONTEXT_MENU_IMAGE') {
      handleContextMenuImage(message.imageUrl, app);
    } else if (message.type === 'CONTEXT_MENU_TEXT') {
      app.loadContent({ contentType: 'text', textContent: message.text });
    }
  });
});

async function loadPendingDrop(app: ReturnType<typeof initApp>): Promise<void> {
  const result = await browser.storage.session.get('pendingDrop');
  const pending = result.pendingDrop as PendingDrop | undefined;

  if (!pending) return;

  await browser.storage.session.remove('pendingDrop');

  if (pending.type === 'CONTEXT_MENU_IMAGE') {
    await handleContextMenuImage(pending.imageUrl, app);
    return;
  }

  if (pending.type === 'CONTEXT_MENU_TEXT') {
    app.loadContent({ contentType: 'text', textContent: pending.text });
  }
}

async function handleContextMenuImage(
  imageUrl: string,
  app: ReturnType<typeof initApp>
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const fileName = imageUrl.split('/').pop() || 'image.png';
    app.loadContent({ contentType: 'image', imageBlob: blob, fileName });
  } catch (err) {
    app.showError('Failed to fetch image.');
  }
}
