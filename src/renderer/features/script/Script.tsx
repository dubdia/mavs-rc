import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { languages, editor } from "monaco-editor/esm/vs/editor/editor.api";
import { useAppDispatch } from "../../store/store";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { useEffect, useState } from "react";
import scriptContextDefinitions from "../../../main/script-context-definitions?raw";
import { IDisposable } from "xterm";

export const Script = ({ id }: { id: string }) => {
  console.log("RENDER Script", id);

  const [editor, setEditor] = useState<ScriptEditorData>(null);
  const [script, setScript] = useState("");
  const [errors, setErrors] = useState<editor.IMarker[]>([]);


  // configure dispose
  useEffect(() => {
    // This effect does nothing on mount, but on unmount it disposes the editor and model
    return () => {
      if(editor) {
        console.log("dispose", editor);
        for (let disposable of editor.disposables) {
          console.log("dispose", disposable);
          disposable.dispose();
        }
      }

    };
  }, [editor]);

  // configure monaco
  const handleEditorWillMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    // validation settings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2015,
      allowNonTsExtensions: true,
      noLib: true,
      strict: true,
    });

    // prepare contents of script-context-definitions (replace line ending with //global with code to make all declarations global in the monaco code editor)
    let contents = scriptContextDefinitions
      .split("\n")
      .map((x) => (x.trim().endsWith("//global") ? "declare global {" : x))
      .join("\n");
    contents += "; export {}";
    var libUri = "ts:filename/global.d.ts";

    const extraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(contents, libUri);

    // create model
    const model = monaco.editor.createModel(scriptContextDefinitions, "typescript", monaco.Uri.parse(libUri));

    // subscribe to markers change
    const onDidChangeMarkersSub = monaco.editor.onDidChangeMarkers(([uri]) => {
      // only get markers for current model
      const model = editor.getModel();
      if(model && uri != model.uri) {
        return;
      }
      const markers = monaco.editor.getModelMarkers({resource: uri})
      setErrors([...markers]);
    })

    // set editor
    setEditor({
      editor: editor,
      monaco: monaco,
      model: model,
      disposables: [
        onDidChangeMarkersSub,
        extraLib,
        model,
        editor
      ]
    });

  


    // subscribe to model
    /*model.onDidChangeContent(() => {
      const model = editor.getModel();
      console.log('change content', model);
      const modelMarkers = monaco.editor.getModelMarkers({ owner: "typescript", resource: model.uri });
      const newErrors = modelMarkers.map((marker) => ({
        message: marker.message,
        severity: marker.severity,
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
      }));
      setErrors(newErrors);
    });*/
  };

  return (
    <HeaderScrollBodyLayout
      header={
       <p>Script</p>
      }
      bodyScrollable={false}
      body={
        <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 bottom-0">
              <Editor
                theme="vs-dark"
                language="javascript"
                height="100%"
                value={script}
                onChange={(x) => setScript(x)}
                onMount={handleEditorWillMount}
              />
            </div>
          </div>
          {/* Problems Tab */}
          <div className="text-red-500 font-mono text-sm">
          {errors.map((error, index) => (
            <div key={index}>
              {error.startLineNumber}:{error.startColumn} - {error.message}
            </div>
          ))}
        </div>
        </div>
      }
    ></HeaderScrollBodyLayout>
  );
};

export interface ScriptEditorData {
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  model: editor.ITextModel,
  disposables: IDisposable[],
}
