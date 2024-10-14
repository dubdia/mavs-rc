import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import { getBuildConfig, getBuildDefine, external, pluginHotRestart } from "./vite.base.config";
import vitePluginString from 'vite-plugin-string'

// https://vitejs.dev/config
export default defineConfig((env) => {
  console.log(`Build Forge Configuration for ${env.mode}`);
  const forgeEnv = env as ConfigEnv<"build">;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);

  const config: UserConfig = {
    build: {
      sourcemap: env.mode == "development",
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => "[name].js",
        formats: ["cjs"],
      },
      rollupOptions: {
        external,
      },
    },
    plugins: [
      pluginHotRestart("restart"), 
      vitePluginString({
        include: [
          'src/main/script-context-definitions.ts'
        ],
      })],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
