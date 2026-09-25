import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: process.env.npm_lifecycle_event === 'test:integration'
      ? ['**/node_modules/**', '**/dist/**'] 
      : ['**/node_modules/**', '**/dist/**', 'tests/integration/**'],
  },
});
