// import required css and the tsx to the renderer
console.log("👋 Hello, i am the renderer!");

// for security, we dont allow any fetch or XMLHttpRequest calls
window.fetch = () => {
  console.warn("Fetch is disabled for security reasons.");
  return Promise.reject("Fetch is disabled.");
};
XMLHttpRequest.prototype.open = () => console.warn("XMLHttpRequest for security reasons.");

// configure monaco editor loader (https://www.npmjs.com/package/@monaco-editor/react)
import { loader } from "@monaco-editor/react";
loader.config({ paths: { vs: "/node_modules/monaco-editor/min/vs" } });

// import app
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import 'overlayscrollbars/overlayscrollbars.css';
import "./app";
