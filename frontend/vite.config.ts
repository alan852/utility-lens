import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const parseAllowedHosts = (): string[] | true | undefined => {
  const envVal = process.env.VITE_ALLOWED_HOSTS || process.env.ALLOWED_HOSTS;
  if (!envVal) return undefined;
  if (envVal.toLowerCase() === 'true' || envVal.toLowerCase() === 'all') return true;
  return envVal
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
};

const allowedHosts = parseAllowedHosts();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_NODE_ENV': JSON.stringify(process.env.VITE_NODE_ENV || process.env.NODE_ENV || 'development'),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    ...(allowedHosts !== undefined ? { allowedHosts } : {}),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    ...(allowedHosts !== undefined ? { allowedHosts } : {}),
  },
})
