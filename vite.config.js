import { defineConfig } from 'vite';

// Detecta se está em produção para ajustar o base do GitHub Pages
const isProd = process.env.NODE_ENV === 'production';
const base = isProd ? '/embeddingSearchPortugues/' : '/';

export default defineConfig({
  base,
  // Configuração para desenvolvimento
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  
  // Configuração de build
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendors para cache otimizado
          vendor: ['@xenova/transformers', 'd3'],
          // Separar módulos core
          core: ['./core/WebGPUEngine.js', './core/SemanticCategories.js', './core/VisualizationEngine.js']
        }
      }
    },
    // Otimizações para produção
    terserOptions: {
      compress: {
        drop_console: false, // Manter logs para debug
        drop_debugger: true
      }
    }
  },
  
  // Configuração de módulos
  esbuild: {
    target: 'es2020'
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: ['@xenova/transformers', 'd3'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  
  // Configuração de assets
  assetsInclude: ['**/*.wgsl'], // Incluir shaders WebGPU
  
  // Configuração de workers (para processamento em background)
  worker: {
    format: 'es'
  },
  
  // Definir variáveis globais
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0')
  },
  
  // Configuração experimental
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      } else {
        return { relative: true };
      }
    }
  }
}); 