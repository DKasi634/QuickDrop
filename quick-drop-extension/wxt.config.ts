import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  manifest: {
    name: 'Quick Drop — Anonymous Sharing',
    description:
      'Drag, paste, or right-click to instantly share images and text via temporary anonymous links. Privacy-first, no accounts needed.',
    version: '1.0.0',
    permissions: ['storage', 'contextMenus', 'notifications', 'activeTab'],
    host_permissions: ['https://*.supabase.co/*'],
    icons: {
      '16': 'icon/icon-16.png',
      '32': 'icon/icon-32.png',
      '48': 'icon/icon-48.png',
      '128': 'icon/icon-128.png',
    },
  },
  vite: () => ({
    envDir: '..',
    plugins: [tailwindcss()],
  }),
});
