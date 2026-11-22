import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates PNG app icons from public/favicon.svg:  npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0.25, resizeOptions: { background: '#12130f' } },
    apple: { sizes: [180], padding: 0.25, resizeOptions: { background: '#12130f' } },
  },
  images: ['public/favicon.svg'],
});
