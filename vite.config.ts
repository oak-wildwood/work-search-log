/// <reference types="vitest/config" />
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        ...configDefaults.coverage.exclude,
        'src/main.ts',
        'src/lib/seedEntries.ts',
        'src/config/states/**',
      ],
      // Provisional: this sandbox can't run `npm ci`/vitest, so these weren't measured
      // against the real report. Run `npm run test:coverage` and set these to the actual
      // numbers it prints before relying on this gate.
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
})
