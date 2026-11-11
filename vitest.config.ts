import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The browser engines need DOM APIs; their pure logic is tested here and
    // the DOM-dependent paths are covered by the manual checklist in README.
    reporters: ['default'],
  },
});
