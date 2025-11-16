import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],

    // Server configuration
    server: {
        host: '0.0.0.0',
        port: 3000,  // Changed from 5173 to match your config
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
                ws: true
            }
        }
    },

    // Build configuration for production
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui': ['lucide-react']
                }
            }
        }
    },

    // Base path for production
    base: process.env.NODE_ENV === 'production' ? './' : '/',

    // Optimization
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom']
    }
});