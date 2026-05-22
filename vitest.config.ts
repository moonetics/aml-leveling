import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],
    globals: false,
    restoreMocks: true,
    hookTimeout: 30_000
  }
});
