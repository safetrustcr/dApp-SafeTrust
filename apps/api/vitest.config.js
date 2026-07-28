import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      include: ['src/routes/escrow/**'],
      exclude: ['src/routes/escrow/__tests__/**'],
    },
  },
});
