import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // If using tsconfig paths

export default defineConfig({
  plugins: [tsconfigPaths()], // If using tsconfig paths, add this
  test: {
    globals: true, // Use global APIs like describe, it, expect
    environment: 'node', // Or 'jsdom' if DOM APIs are needed later
    // reporters: ['default', 'html'], // Optional: For HTML report
  },
});
