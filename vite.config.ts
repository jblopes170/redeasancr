import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 500,
      ignored: [
        '**/github-upload-*/**',
        '**/stitch-redesign-reference/**',
        '**/.tmp_old_ntmr/**',
        '**/.tanstack/**',
      ],
    },
  },
})
