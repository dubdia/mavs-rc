import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { languages, editor, MarkerSeverity } from "monaco-editor/esm/vs/editor/editor.api";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { useEffect, useRef, useState } from "react";
import scriptContextDefinitions from "../../../main/script-context-definitions?raw";
import { IDisposable } from "xterm";
import { Button, Card, CardBody } from "@nextui-org/react";
import { ipc } from "../../app";
import { toast } from "react-toastify";
import { FaCircleExclamation, FaCircleInfo, FaCircleQuestion, FaCircleXmark, FaJs } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { sessionExecuteScript, sessionUpdateScript, setScriptContent } from "../../store/remotesSlice";
import { render } from "react-dom";
import { IconType } from "react-icons";
import { FaGreaterThan } from "react-icons/fa";

export const Script = ({ id, scriptId }: { id: string; scriptId: string }) => {
  const dispatch = useAppDispatch();

  const script = useRemoteSelector(id, (r) => r.session.scripts.original.find((x) => x.scriptId == scriptId));
  const editorRef = useRef<ScriptEditorData>(null);
  const [markers, setMarkers] = useState<editor.IMarker[]>([]);

  console.log("RENDER Script", id, scriptId, script);

  // configure dispose
  useEffect(() => {
    // This effect does nothing on mount, but on unmount it disposes the editor and model
    return () => {
      if (editorRef?.current) {
        console.log("DISPOSE");
        for (let disposable of editorRef.current.disposables) {
          disposable?.dispose();
        }
      }
    };
  }, []);

  // configure monaco
  const handleEditorWillMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    console.log("MOUNT EDITOR", editorRef.current);

    const jsDefaults: typeof monaco.languages.typescript.javascriptDefaults & { configured?: boolean } = monaco
      .languages.typescript.javascriptDefaults as any;
    if (!jsDefaults.configured) {
      jsDefaults.configured = true;
      console.log("configure jsDefaults of monaco one time");

      // validation settings
      jsDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [1375],
      });

      // compiler options
      jsDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        allowNonTsExtensions: true,
        //  lib: ["ES2020", "dom"],
        strict: true,
        allowJs: true,
        checkJs: true,
        noEmit: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        lib: ["es2017", "es2018.promise", "es2019.array"],
      });

      // prepare contents of script-context-definitions (replace line ending with //global with code to make all declarations global in the monaco code editor)
      let contents = scriptContextDefinitions
        .split("\n")
        .map((x) => (x.trim().endsWith("//global") ? "declare global {" : x))
        .join("\n");
      contents += "; export {}";
      var libUri = "ts:filename/global.d.ts";
      jsDefaults.addExtraLib(contents, libUri);

      // add promise lib
      /*jsDefaults.addExtraLib(`
        // Definitions to enable Promise support
        declare interface PromiseConstructor {
          new <T>(executor: (
            resolve: (value: T | PromiseLike<T>) => void,
            reject: (reason?: any) => void
          ) => void): Promise<T>;
          reject(reason?: any): Promise<never>;
          resolve<T>(value: T | PromiseLike<T>): Promise<T>;
        }
        declare var Promise: PromiseConstructor;
      `, 'filename/fake_promises.d.ts');*/

      // create model
      //const model = monaco.editor.createModel(scriptContextDefinitions, "typescript", monaco.Uri.parse(libUri));
    }

    /* const x = (options?: {hello?: string, world?: string}) => {
      return "";
    }
    x({});*/

    // subscribe to markers change
    const onDidChangeMarkersSub = monaco.editor.onDidChangeMarkers(([uri]) => {
      // only get markers for current model
      const model = editor.getModel();
      if (model && uri != model.uri) {
        return;
      }
      let markers = monaco.editor.getModelMarkers({ resource: uri });

      // sort them by severity then by line number
      markers = markers.sort((a, b) => {
        if (a.severity !== b.severity) {
          return b.severity - a.severity; // Assuming higher enum values are less severe
        }
        return a.startLineNumber - b.startLineNumber; // Sort by line number if the severity is the same
      });

      setMarkers([...markers]);
    });

    // set editor
    editorRef.current = {
      editor: editor,
      monaco: monaco,
      disposables: [onDidChangeMarkersSub, editor],
    };
  };

  // functions
  const saveAndExecuteScript = async () => {
    // save current
    await dispatch(sessionUpdateScript({ id: id, script: script }));

    // check
    if (script == null || script.content == "") {
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
    editorRef.current.editor.setSelection(marker);
  };

  const renderMarker = (marker: editor.IMarker, index: number): React.ReactNode => {
    let Icon: React.ReactNode;
    switch (marker.severity) {
      case MarkerSeverity.Error:
        Icon = <FaCircleXmark className="text-red-500"></FaCircleXmark>;
        break;
      case MarkerSeverity.Warning:
        Icon = <FaCircleExclamation className="text-orange-500"></FaCircleExclamation>;
        break;
      case MarkerSeverity.Info:
        Icon = <FaCircleInfo className="text-gray-200"></FaCircleInfo>;
        break;
      case MarkerSeverity.Hint:
      default:
        Icon = <FaCircleQuestion className="text-gray-200"></FaCircleQuestion>;
        break;
    }

    return (
      <div
        key={"marker-" + index}
        className="p-1 flex flex-row gap-2 cursor-pointer items-center font-mono text-xs hover:bg-divider"
        onClick={() => navigateToMarker(marker)}
      >
        {Icon}
        <span className="text-gray-200"> {marker.message}</span>
        <span className="text-gray-400">
          {" "}
          {`${marker.code.toString()} [Ln ${marker.startLineNumber}, Col ${marker.startColumn}]`}
        </span>
      </div>
    );
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
              className={`absolute top-0 left-0 right-0 bottom-0 no-select border-divider border-t-1 ${
                markers && markers.length > 0 ? "border-b-0" : "border-b-1"
              }`}
            >
              <Editor
                theme="vs-dark"
                language="javascript"
                height="100%"
                value={script.content}
                onChange={(x) => dispatch(setScriptContent({ id: id, scriptId: scriptId, content: x }))}
                onMount={handleEditorWillMount}
              />
            </div>
          </div>
          {/* Problems Tab */}
          {markers && markers.length > 0 && (
            <div
              className={`max-h-16 overflow-y-auto overflow-x-hidden border-divider border-t-1 ${
                script.log && script.log.length > 0 ? "border-b-0" : "border-b-1"
              }`}
            >
              {markers.map((marker, index) => renderMarker(marker, index))}
            </div>
          )}
          {/* Logs  */}
          {script.log && script.log.length > 0 && (
            <div className="max-h-16 overflow-y-auto overflow-x-hidden border-divider border-1">
              {script.log.map((log, index) => (
                <span key={"log-" + index}>{log}</span>
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
  disposables: IDisposable[];
}
