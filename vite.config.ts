import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://<user>.github.io/renovativ-ai-map/
export default defineConfig({
  plugins: [react()],
  base: '/renovativ-ai-map/',
});
