import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from a GitHub Pages project path as well as locally.
export default defineConfig({ base: './', plugins: [react()], server: { port: 5173, open: true } });
