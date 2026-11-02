import { defineConfig } from 'vitest/config'
import baseConfig from '../../vite.config'

// Explicit generator configuration; the default app test suite never collects it.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['scripts/qa/generate-sggs-bani-profiles.test.ts'],
  },
})
