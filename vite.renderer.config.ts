import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: './',
    define: {
      __mode: JSON.stringify(mode),
    },
    build: {
      outDir: `.vite/renderer/${name}`,
      rollupOptions: {
        input: {
          app: "./src/renderer/index.html",
        },
      }
    },
    plugins: [
      pluginExposeRenderer(name),
      monacoEditorPlugin({
        publicPath: mode != 'development' ?  './' : undefined, // in production we need to adapt this path. Also see renderer.ts.
        languageWorkers: ['typescript', 'css', 'html', 'json', 'editorWorkerService'],
      }),
    ],
    resolve: {
      preserveSymlinks: true,
    },
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    },
    clearScreen: false,
  } as UserConfig;
});
