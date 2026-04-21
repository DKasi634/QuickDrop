import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'quick-drop-image',
      title: '🪂 Quick Drop Image',
      contexts: ['image'],
    });

    browser.contextMenus.create({
      id: 'quick-drop-text',
      title: '🪂 Quick Drop Selection',
      contexts: ['selection'],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'quick-drop-image' && info.srcUrl) {
      try {
        await browser.runtime.sendMessage({
          type: 'CONTEXT_MENU_IMAGE',
          imageUrl: info.srcUrl,
        });
      } catch {
        try {
          await browser.action.openPopup();
          setTimeout(async () => {
            try {
              await browser.runtime.sendMessage({
                type: 'CONTEXT_MENU_IMAGE',
                imageUrl: info.srcUrl!,
              });
            } catch (err) {
              await browser.storage.session.set({
                pendingDrop: {
                  type: 'CONTEXT_MENU_IMAGE',
                  imageUrl: info.srcUrl,
                },
              });
            }
          }, 500);
        } catch (err) {
          await browser.storage.session.set({
            pendingDrop: {
              type: 'CONTEXT_MENU_IMAGE',
              imageUrl: info.srcUrl,
            },
          });
          browser.notifications.create({
            type: 'basic',
            iconUrl: '/icon/icon-128.png',
            title: 'Quick Drop',
            message: 'Click the extension icon to complete your image drop.',
          });
        }
      }
    }

    if (info.menuItemId === 'quick-drop-text' && info.selectionText) {
      try {
        await browser.runtime.sendMessage({
          type: 'CONTEXT_MENU_TEXT',
          text: info.selectionText,
        });
      } catch {
        try {
          await browser.action.openPopup();
          setTimeout(async () => {
            try {
              await browser.runtime.sendMessage({
                type: 'CONTEXT_MENU_TEXT',
                text: info.selectionText!,
              });
            } catch {
              await browser.storage.session.set({
                pendingDrop: {
                  type: 'CONTEXT_MENU_TEXT',
                  text: info.selectionText,
                },
              });
            }
          }, 500);
        } catch {
          await browser.storage.session.set({
            pendingDrop: {
              type: 'CONTEXT_MENU_TEXT',
              text: info.selectionText,
            },
          });
          browser.notifications.create({
            type: 'basic',
            iconUrl: '/icon/icon-128.png',
            title: 'Quick Drop',
            message: 'Click the extension icon to complete your text drop.',
          });
        }
      }
    }
  });
});
