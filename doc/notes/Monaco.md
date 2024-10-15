Configuring monaco was a bit of a hussle...
When running on Vite in Development the monaco code editor and the workers had no problem loading.
Only when running in production using "npm run makeAndInstall" the monaco code editor could not be loaded.

### Fix for loading the editor in production
I fixed the problem with loading the editor itself in production by importing it like this:
```typescript
// renderer.ts
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
loader.config({ monaco });
```
or like this:
```typescript
// renderer.ts
if (isDev) {
  loader.config({ paths: { vs: "/node_modules/monaco-editor/min/vs" } });
} else {
  loader.config({ paths: { vs: "./../../../../../node_modules/monaco-editor/min/vs" } });
}
```
where i find the first solution more elegant. Somehow in production, the relative path to the node_modules folder is different and we would have to go 5 folders up.


### Fix for loading the workers
The workers were unable to load in production. I always got this error in the Developer-Tools console:
```
Could not create web worker(s). Falling back to loading web worker code in main thread, which might cause UI freezes. Please see https://github.com/microsoft/monaco-editor#faq
Uncaught : Event {isTrusted: true, type: 'error', target: Worker, currentTarget: Worker, eventPhase: 0, …}
```
And in the Network-Tab i saw that the request to the worker-files had the status "(canceled)". The issue was that in production the worker files were requested for a wrong path.

I fixed it by playing around with the "publicPath" property of the monacoEditorPlugin inside the vite.renderer.config.ts and by resolving the paths by myself inside the renderer.ts.

```typescript
// renderer.ts
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
```
```typescript
// vite.renderer.config.ts
    plugins: [
      pluginExposeRenderer(name),
      monacoEditorPlugin({
        publicPath: mode != 'development' ?  './' : undefined, // <- here
        languageWorkers: ['typescript', 'css', 'html', 'json', 'editorWorkerService'],
      }),
    ],
```

### My Expirements with the publicPath and the rendererPath variables:
(last version worked)
```
PUBLIC PATH		    RENDERER PATH		    REQUESTED PATH & ACTUAL PATH								                                   
NONE			    NONE			        app.asar/.vite/renderer/main_window/src/renderer/monacoeditorwork/ts.worker.bundle.js
                                            app.asar\.vite\renderer\main_window\monacoeditorwork\*
./			        NONE			        app.asar/.vite/renderer/main_window/src/renderer//ts.worker.bundle.js
                                            app.asar\.vite\renderer\main_window\*
./monacoeditorwork	NONE			        app.asar/.vite/renderer/main_window/src/renderer/monacoeditorwork/ts.worker.bundle.js
                                            app.asar/.vite/renderer/main_window/src/renderer/monacoeditorwork/ts.worker.bundle.js
./../			    NONE			        app.asar/.vite/renderer/main_window/src//ts.worker.bundle.js
                                            app.asar\.vite\renderer\*
./			        ./../../*		        app.asar/.vite/renderer/main_window/editor.worker.bundle.js	
                                            app.asar/.vite/renderer/main_window/editor.worker.bundle.js	
```