import type { AppController } from './app';

export function initDropZone(app: AppController): void {
  const dropZone = document.getElementById('drop-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const btnBrowse = document.getElementById('btn-browse')!;
  const btnPaste = document.getElementById('btn-paste')!;

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    const related = e.relatedTarget as Node | null;
    if (!dropZone.contains(related)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const dt = e.dataTransfer;
    if (!dt) return;

    const files = Array.from(dt.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));

    if (imageFile) {
      app.loadContent({
        contentType: 'image',
        imageBlob: imageFile,
        fileName: imageFile.name,
      });
      return;
    }

    const text = dt.getData('text/plain');
    if (text && text.trim().length > 0) {
      app.loadContent({
        contentType: 'text',
        textContent: text.trim(),
      });
      return;
    }

    const htmlData = dt.getData('text/html');
    const imgUrlMatch = htmlData?.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgUrlMatch?.[1]) {
      fetchImageFromUrl(imgUrlMatch[1], app);
      return;
    }

    app.showError('Unsupported content. Try dropping an image or text.');
  });

  dropZone.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    fileInput.click();
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file && file.type.startsWith('image/')) {
      app.loadContent({
        contentType: 'image',
        imageBlob: file,
        fileName: file.name,
      });
    } else if (file) {
      app.showError('Only image files are supported for now.');
    }
    fileInput.value = '';
  });

  btnPaste.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await handlePaste(app);
    } catch (err) {
      app.showError('Paste failed. Try Ctrl+V instead.');
    }
  });

  document.addEventListener('paste', async (e) => {
    if (app.getCurrentView() !== 'dropzone') return;
    e.preventDefault();
    await handlePasteEvent(e, app);
  });
}

async function handlePasteEvent(
  e: ClipboardEvent,
  app: AppController
): Promise<void> {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        app.loadContent({
          contentType: 'image',
          imageBlob: blob,
          fileName: `paste-${Date.now()}.png`,
        });
        return;
      }
    }
  }

  for (const item of Array.from(items)) {
    if (item.type === 'text/plain') {
      const text = await new Promise<string>((resolve) => {
        item.getAsString(resolve);
      });
      if (text.trim()) {
        app.loadContent({ contentType: 'text', textContent: text.trim() });
        return;
      }
    }
  }

  app.showError('Nothing to paste. Copy an image or text first.');
}

async function handlePaste(app: AppController): Promise<void> {
  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const item of clipboardItems) {
      const imageType = item.types.find((t) => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        app.loadContent({
          contentType: 'image',
          imageBlob: blob,
          fileName: `paste-${Date.now()}.png`,
        });
        return;
      }

      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        if (text.trim()) {
          app.loadContent({ contentType: 'text', textContent: text.trim() });
          return;
        }
      }
    }

    app.showError('Nothing to paste. Copy an image or text first.');
  } catch {
    app.showError('Paste from clipboard. Use Ctrl+V or Cmd+V.');
  }
}

async function fetchImageFromUrl(
  url: string,
  app: AppController
): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const fileName = url.split('/').pop()?.split('?')[0] || 'image.png';
    app.loadContent({ contentType: 'image', imageBlob: blob, fileName });
  } catch (err) {
    app.showError('Failed to load image from URL.');
  }
}
