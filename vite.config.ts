import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
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
