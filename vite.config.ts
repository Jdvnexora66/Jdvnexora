import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Preserve compatibility with the Supabase variables already configured on Netlify.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
