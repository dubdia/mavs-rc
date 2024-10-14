declare global {
  const __mode: string; // set by vite define
}
export const isDev = __mode == "development";
console.log(`👋 Hello, i am the renderer! The app is ${isDev ? "running in Dev-Mode" : "is packacked"}`);

// for security, we dont allow any fetch or XMLHttpRequest calls
window.fetch = () => {
  console.warn("Fetch is disabled for security reasons.");
  return Promise.reject("Fetch is disabled.");
};
XMLHttpRequest.prototype.open = () => console.warn("XMLHttpRequest for security reasons.");

// configure monaco editor loader (https://www.npmjs.com/package/@monaco-editor/react)
// using a relative path like "./" resolves both in dev and prod to the current file "/src/renderer/renderer.ts".
// the problem is that the node_modules folder has a different relative location in dev and prod.
// In dev the node_modules folder is just up to folders.
// In prod on the other hand its up by 5 folders.
// So we need to check if the app is packacked and provide a different folder then
// the variable "window.isAppPackaged" is set in main.ts
//todo checkout https://www.jameskerr.blog/posts/offline-monaco-editor-in-electron/
import { loader } from "@monaco-editor/react";
if (isDev) {
  loader.config({ paths: { vs: "/node_modules/monaco-editor/min/vs" } });
} else {
  loader.config({ paths: { vs: "./../../../../../node_modules/monaco-editor/min/vs" } });
}

// configure monaco in prod
/*if (!isDev) {
  window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
      console.log("called getWorkerUrl", moduleId, label);
      if (label === "typescript" || label === "javascript") {
        return "./ts.worker.bundle.js";
      }
      if (label === "css") {
        return "./css.worker.bundle.js";
      }
      if (label === "html") {
        return "./html.worker.bundle.js";
      }
      if (label === "json") {
        return "./json.worker.bundle.js";
      }
      return "./editor.worker.bundle.js";
    },
  };
}*/

// import required css and tsx to the renderer
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import "overlayscrollbars/overlayscrollbars.css";
import "./app";
