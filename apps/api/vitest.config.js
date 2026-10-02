import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Both extensions: the API is mid-migration from JS to TS.
    include: ['src/**/*.test.js', 'src/**/*.test.ts'],
    coverage: {
      include: ['src/routes/escrow/**'],
      exclude: ['src/routes/escrow/__tests__/**'],
    },
  },
});
