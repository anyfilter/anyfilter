import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'AnyFilter',
    description:
      'Hide anything, on any site. Hides ads, engagement bait, promos, platitudes, hate, spam bots and anything you describe, and shows you what it hid. X first, more sites coming. Bring your own Jev API key.',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel'],
    host_permissions: [
      'https://x.com/*',
      'https://ai-gateway.vercel.sh/*',
      'https://api.typesafe.ai/*',
    ],
    action: {
      default_title: 'AnyFilter',
    },
  },
});
