import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/public/wasm/**', '**/public/models/**']
    }
  },
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    include: ['@mediapipe/tasks-vision']
  }
});
