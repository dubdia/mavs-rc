import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { languages, editor } from "monaco-editor/esm/vs/editor/editor.api";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { useEffect, useState } from "react";
import scriptContextDefinitions from "../../../main/script-context-definitions?raw";
import { IDisposable } from "xterm";
import { Button, Card, CardBody } from "@nextui-org/react";
import { ipc } from "../../app";
import { toast } from "react-toastify";
import { FaJs } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { sessionExecuteScript, sessionUpdateScript, setScriptContent } from "../../store/remotesSlice";

export const Script = ({ id, scriptId }: { id: string; scriptId: string }) => {
  console.log("RENDER Script", id, scriptId);

  const dispatch = useAppDispatch();

  const script = useRemoteSelector(id, (r) => r.session.scripts.original.find((x) => x.info.scriptId == scriptId));
  const [editor, setEditor] = useState<ScriptEditorData>(null);
  const [errors, setErrors] = useState<editor.IMarker[]>([]);

  // configure dispose
  useEffect(() => {
    // This effect does nothing on mount, but on unmount it disposes the editor and model
    return () => {
      if (editor) {
        console.log('DISPOSE');
        for (let disposable of editor.disposables) {
          disposable?.dispose();
        }
      }
    };
  }, [editor]);

  // configure monaco
  const handleEditorWillMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    console.log("MOUNT EDITOR");
    // validation settings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1375]
    });

    // compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      
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
      if (model && uri != model.uri) {
        return;
      }
      const markers = monaco.editor.getModelMarkers({ resource: uri });
      setErrors([...markers]);
    });

    // set editor
    setEditor({
      editor: editor,
      monaco: monaco,
      model: model,
      disposables: [onDidChangeMarkersSub, extraLib, model, editor],
    });
  };

  // functions
  const saveAndExecuteScript = async () => {
    // save current
    await dispatch(sessionUpdateScript({ id: id, script: script.info }));

    // check
    if (script == null || script.info.content == "") {
      toast.warn("Please enter a script first");
    }

    // try to execute
    try {
      await dispatch(sessionExecuteScript({ id: id, scriptId: scriptId }));
    } catch (err) {
      console.error("failed to execute script", err);
      toast.error("Failed to execute script: " + err?.toString());
    }
  };

  const navigateToMarker = (marker: editor.IMarker) => {
    editor.editor.setSelection(marker);
  };

  // render
  return (
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-2 items-center">
          {/* Space */}
          <span className="flex-1"></span>

          {/* Execute */}
          <Button color="success" onClick={saveAndExecuteScript}>
            <FaJs></FaJs>
            Run
          </Button>
        </div>
      }
      bodyScrollable={false}
      headerInCard={false}
      body={
        <div className="w-full h-full max-h-full flex flex-col pb-4">
          <div className="flex-1 relative">
            <div
              className={`absolute top-0 left-0 right-0 bottom-0 no-select border-gray-400 border-1 ${
                errors && errors.length > 0 ? "border-b-0" : ""
              }`}
            >
              <Editor
                theme="vs-dark"
                language="javascript"
                height="100%"
                value={script.info.content}
                onChange={(x) => dispatch(setScriptContent({ id: id, scriptId: scriptId, content: x }))}
                onMount={handleEditorWillMount}
              />
            </div>
          </div>
          {/* Problems Tab */}
          {errors && errors.length > 0 && (
            <div className="text-red-500 font-mono text-xs max-h-16 overflow-y-auto overflow-x-hidden border-gray-400 border-1">
              {errors.map((error, index) => (
                <div key={index} className="h-4 cursor-pointer" onClick={() => navigateToMarker(error)}>
                  {error.startLineNumber}:{error.startColumn} - {error.message}
                </div>
              ))}
            </div>
          )}
        </div>
      }
    ></HeaderScrollBodyLayout>
  );
};

export interface ScriptEditorData {
  editor: editor.IStandaloneCodeEditor;
  monaco: Monaco;
  model: editor.ITextModel;
  disposables: IDisposable[];
}
