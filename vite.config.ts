import { defineConfig, defaultExclude } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__banidb': {
        target: 'https://api.banidb.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/__banidb/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    env: {
      VITE_INSFORGE_URL: 'https://naamras-qa.insforge.app',
      VITE_INSFORGE_FUNCTIONS_URL: 'https://naamras-qa.functions.insforge.app',
      VITE_INSFORGE_BANIDB_FUNCTION: 'banidb-proxy',
    },
    exclude: [...defaultExclude, 'tmp/**'],
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        inline: [
          'msw',
          'path-to-regexp',
          'graphql',
          'react-router',
          'react-router-dom',
          '@testing-library/react',
          '@testing-library/dom',
          '@testing-library/user-event',
          '@insforge/sdk',
          'socket.io-client',
          'socket.io-parser',
          'engine.io-client',
          'engine.io-parser',
          '@socket.io/component-emitter',
        ],
      },
    },
  },
})
