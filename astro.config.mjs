import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  site: 'https://aitsvet710-ux.github.io',
  base: '/LHvost',
  vite: {
    plugins: [tailwindcss()]
  }
});
