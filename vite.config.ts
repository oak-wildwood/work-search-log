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
      // Naming `include` is what makes untested files report as 0% rather than
      // being left out of the summary entirely, which is the whole point: a file
      // nobody tested should drag the number down, not quietly vanish from it.
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        'src/main.ts',
        'src/lib/seedEntries.ts',
        'src/config/states/**',
      ],
      // Measured, not aspirational. As of the commit that added this the report
      // reads 80.98 / 72.74 / 68.71 / 82.18, and these sit a couple of points
      // under that: far enough that ordinary movement doesn't fail the build,
      // close enough that a real regression does. A threshold set well below
      // where the code actually sits passes while coverage quietly collapses,
      // which is the failure mode this gate exists to prevent.
      //
      // Ratchet them up as coverage rises. Never lower one to make a build pass.
      thresholds: {
        statements: 78,
        branches: 70,
        functions: 66,
        lines: 80,
      },
    },
  },
})
