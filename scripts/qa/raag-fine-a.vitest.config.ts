import { defineConfig } from 'vitest/config'
import baseConfig from '../../vite.config'

// Only this explicit command can collect the mutating metadata generator.
export default defineConfig({
  ...baseConfig,
  test: { ...baseConfig.test, include: ['scripts/qa/generate-raag-fine-a-profiles.test.ts'] },
})
