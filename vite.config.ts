import { defineConfig, defaultExclude } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/ios/App/App/public/**'],
    },
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
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      VITE_SUPABASE_URL: 'https://naamras-qa.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_SUPABASE_FUNCTIONS_URL: 'https://naamras-qa.supabase.co/functions/v1',
      VITE_SUPABASE_BANIDB_FUNCTION: 'banidb-proxy',
    },
    exclude: [...defaultExclude, 'tmp/**', 'dist/**', 'ios/**'],
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
          '@supabase/supabase-js',
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
