import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envPrefix: ['VITE_', 'MAPBOX_'],
  plugins: [react()],
});
