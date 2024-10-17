declare global {
  const __mode: string; // set by vite define
}
export const isDev = __mode == "development";
console.log(`👋 Hello, i am the renderer! The app is ${isDev ? "running in Dev-Mode" : "packacked"}`);

// for security, we dont allow any fetch or XMLHttpRequest calls
window.fetch = (...params: unknown[]) => {
  console.warn("Fetch is disabled for security reasons.", params);
  return Promise.reject("Fetch is disabled.");
};
XMLHttpRequest.prototype.open = (...params: unknown[]) => console.warn("XMLHttpRequest for security reasons.", params);

// configure monaco editor loader (https://www.npmjs.com/package/@monaco-editor/react)
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
loader.config({ monaco });

// configure monaco worker paths for prod environment (see also vite.renderer.config.ts: publicPath)
if (!isDev) {
  window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
      console.log("called getWorkerUrl", moduleId, label);
      if (label === "typescript" || label === "javascript") {
        return "./../../ts.worker.bundle.js";
      }
      if (label === "css") {
        return "./../../css.worker.bundle.js";
      }
      if (label === "html") {
        return "./../../html.worker.bundle.js";
      }
      if (label === "json") {
        return "./../../json.worker.bundle.js";
      }
      return "./../../editor.worker.bundle.js";
    },
  };
}

// import required css and tsx to the renderer
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import "overlayscrollbars/styles/overlayscrollbars.css";
import "allotment/dist/style.css";
import "./app";
