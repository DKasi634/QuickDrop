import type { ContentType, DropResult, ExpiryOption } from '../../lib/types';

type View = 'dropzone' | 'preview' | 'share' | 'history';

export interface LoadedContent {
  contentType: ContentType;
  imageBlob?: Blob;
  fileName?: string;
  textContent?: string;
}

export interface AppController {
  showView(view: View): void;
  getCurrentView(): View;
  loadContent(content: LoadedContent): void;
  getContent(): LoadedContent | null;
  showShareResult(result: DropResult): void;
  getExpiry(): ExpiryOption;
  setExpiry(expiry: ExpiryOption): void;
  getCaption(): string;
  setUploading(uploading: boolean): void;
  showError(message: string): void;
  on(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

export function initApp(): AppController {
  let currentView: View = 'dropzone';
  let loadedContent: LoadedContent | null = null;
  let selectedExpiry: ExpiryOption = '24h';
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};

  const views: Record<View, HTMLElement> = {
    dropzone: document.getElementById('view-dropzone')!,
    preview: document.getElementById('view-preview')!,
    share: document.getElementById('view-share')!,
    history: document.getElementById('view-history')!,
  };
  const uploadOverlay = document.getElementById('upload-overlay')!;
  const errorToast = document.getElementById('error-toast')!;
  const tabDrop = document.getElementById('tab-drop')!;
  const tabHistory = document.getElementById('tab-history')!;

  tabDrop.addEventListener('click', () => {
    tabDrop.classList.add('active');
    tabHistory.classList.remove('active');
    if (loadedContent) {
      controller.showView('preview');
    } else {
      controller.showView('dropzone');
    }
  });

  tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('active');
    tabDrop.classList.remove('active');
    controller.showView('history');
    controller.emit('history:show');
  });

  const controller: AppController = {
    showView(view: View) {
      for (const v of Object.values(views)) {
        v.classList.add('hidden');
      }
      views[view].classList.remove('hidden');
      currentView = view;

      if (view === 'history') {
        tabHistory.classList.add('active');
        tabDrop.classList.remove('active');
      } else {
        tabDrop.classList.add('active');
        tabHistory.classList.remove('active');
      }
    },

    getCurrentView() {
      return currentView;
    },

    loadContent(content: LoadedContent) {
      loadedContent = content;
      controller.showView('preview');
      controller.emit('preview:load', content);
    },

    getContent() {
      return loadedContent;
    },

    showShareResult(result: DropResult) {
      controller.showView('share');
      controller.emit('share:show', result);
    },

    getExpiry() {
      return selectedExpiry;
    },

    setExpiry(expiry: ExpiryOption) {
      selectedExpiry = expiry;
    },

    getCaption() {
      const input = document.getElementById('caption-input') as HTMLInputElement;
      return input?.value?.trim() || '';
    },

    setUploading(uploading: boolean) {
      if (uploading) {
        uploadOverlay.classList.remove('hidden');
      } else {
        uploadOverlay.classList.add('hidden');
      }
    },

    showError(message: string) {
      errorToast.textContent = `⚠️ ${message}`;
      errorToast.classList.remove('hidden');
      setTimeout(() => {
        errorToast.classList.add('hidden');
      }, 4000);
    },

    on(event: string, callback: (...args: any[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    emit(event: string, ...args: any[]) {
      const cbs = listeners[event] || [];
      for (const cb of cbs) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      }
    },
  };

  controller.on('reset', () => {
    loadedContent = null;
    selectedExpiry = '24h';
    const captionInput = document.getElementById('caption-input') as HTMLInputElement;
    if (captionInput) captionInput.value = '';
    controller.showView('dropzone');
  });

  return controller;
}
