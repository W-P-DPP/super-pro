import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    ssr: 'main.ts',
    outDir: 'dist',
    target: 'node18',
    rollupOptions: {
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
  
  ssr: {
    // 将所有第三方依赖（含传递依赖）一起打包进 dist，运行时无需 node_modules
    // true 表示不外部化任何 node_modules 包；Node 内置模块始终保持外部
    noExternal: true,
  },
});
