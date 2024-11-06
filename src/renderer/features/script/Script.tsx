import { Editor, Monaco } from "@monaco-editor/react";
import { editor, MarkerSeverity } from "monaco-editor/esm/vs/editor/editor.api";
import { useAppDispatch } from "../../store/store";
import React, { useEffect, useRef, useState } from "react";
// eslint-disable-next-line import/no-unresolved
import scriptContextDefinitions from "../../../main/script-context-definitions?raw";
import { IDisposable } from "xterm";
import { FaCircleExclamation, FaCircleInfo, FaCircleQuestion, FaCircleXmark } from "react-icons/fa6";
import { setScriptContent } from "../../store/remotesSlice";
import { useScripts } from "./scripts.hook";
import { ScriptLog, ScriptTab } from "../../models/ScriptList";
// eslint-disable-next-line import/namespace
import { Allotment } from "allotment";
import { Tab, Tabs } from "@nextui-org/react";

export const Script = ({ id, name }: { id: string; name: string }) => {
  const dispatch = useAppDispatch();

  const editorRef = useRef<ScriptEditorData>(null);
  const [markers, setMarkers] = useState<editor.IMarker[]>([]);

  const scripts = useScripts(id);

  const tabs = [
    {
      name: "problems" as ScriptTab,
      label: "Problems",
    },
    {
      name: "logs" as ScriptTab,
      label: "Logs",
    },
  ];
  console.log("RENDER Script", id, name);

  // keep a script ref for the monaco editor..
  const scriptsRef = useRef(scripts);
  useEffect(() => {
    scriptsRef.current = scripts;
  }, [scripts]);

  // configure dispose
  useEffect(() => {
    // This effect does nothing on mount, but on unmount it disposes the editor and model
    return () => {
      if (editorRef?.current) {
        for (const disposable of editorRef.current.disposables) {
          disposable?.dispose();
        }
      }
    };
  }, [editorRef]);

  // configure monaco
  const handleEditorWillMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    // configure defaults (one time) => we store a configured boolean at the javascriptDefaults object
    const jsDefaults: typeof monaco.languages.typescript.javascriptDefaults & { configured?: boolean } =
      monaco.languages.typescript.javascriptDefaults;
    if (!jsDefaults.configured) {
      jsDefaults.configured = true;

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
      const libUri = "ts:filename/global.d.ts";
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

    // register shortcuts for this editor instance
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
      scriptsRef.current.saveScript(scripts.script.name);
    });
    editor.addCommand(monaco.KeyCode.F5, function () {
      scriptsRef.current.saveAndExecuteScript(scripts.script.name);
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, function () {
      scriptsRef.current.saveAndExecuteScript(scripts.script.name);
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, function () {
      scriptsRef.current.addScript();
    });

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

  const renderLog = (log: ScriptLog, index: number): React.ReactNode => {
    const parts: React.ReactNode[] = [<FaCircleInfo className="text-gray-200"></FaCircleInfo>];
    if (log.timestamp && log.timestamp > 0) {
      const date = new Date(log.timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const seconds = date.getSeconds().toString().padStart(2, "0");
      const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
      const formated = `${hours}:${minutes}:${seconds}.${milliseconds}`;
      parts.push(<span className="text-gray-400">{formated}</span>);
    }
    if (log.message && log.message != "") {
      parts.push(<span className="text-gray-200"> {log.message}</span>);
    }
    if (log.params && log.params.length > 0) {
      parts.push(
        ...log.params.map((param, paramIndex) => (
          <span key={"log-" + index + "-" + paramIndex} className="text-gray-400">
            {" "}
            {param}
          </span>
        ))
      );
    }

    return (
      <div key={"log-" + index} className="p-1 flex flex-row gap-2 items-center font-mono text-xs hover:bg-divider">
        {...parts}
      </div>
    );
  };

  // render
  return (
    <div className="w-full h-full max-h-full flex pb-4">
      <Allotment
        vertical={true}
        className="flex-1"
        defaultSizes={scripts.defaultSizes}
        minSize={120}
        onChange={(s) => scripts.setSizes(s)}
      >
        {/* Editor */}
        <div className="w-full h-full relative">
          <div
            className={`absolute top-0 left-0 right-0 bottom-0 select-none border-divider border-t-1 ${
              markers && markers.length > 0 ? "border-b-0" : "border-b-1"
            }`}
          >
            <Editor
              theme="vs-dark"
              language="javascript"
              height="100%"
              value={scripts.script.contents}
              onChange={(x) => dispatch(setScriptContent({ id: id, name: name, contents: x }))}
              onMount={handleEditorWillMount}
            />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex flex-col gap-2 h-full w-full">
          {/* Tabs in the top part */}
          <Tabs
            variant="underlined"
            className="max-w-full overflow-auto"
            size="sm"
            selectedKey={scripts.script.selectedTab}
            onSelectionChange={(key) => scripts.selectTab(scripts.script.name, key as ScriptTab)}
            items={tabs}
          >
            {(item) => <Tab key={item.name} title={item.label}></Tab>}
          </Tabs>

          {/* Selected tab fills the bottom */}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 bottom-0">
              {/* Problems Tab */}
              {scripts.script.selectedTab == "problems" &&
                (markers && markers.length > 0 ? (
                  <div className={`h-full overflow-y-auto overflow-x-hidden`}>
                    {markers.map((marker, index) => renderMarker(marker, index))}
                  </div>
                ) : (
                  <p className="p-1 flex flex-row gap-2 items-center font-mono text-xs">
                    No problems have been detected.
                  </p>
                ))}

              {/* Logs  */}
              {scripts.script.selectedTab == "logs" &&
                (scripts.script.log && scripts.script.log.length > 0 ? (
                  <div className="h-full overflow-y-auto overflow-x-hidden">
                    {scripts.script.log.map((log, index) => renderLog(log, index))}
                  </div>
                ) : (
                  <p className="p-1 flex flex-row gap-2 items-center font-mono text-xs">
                    No logs so far. Use the log(...) function to log something.
                  </p>
                ))}
            </div>
          </div>
        </div>
      </Allotment>
    </div>
  );
};

export interface ScriptEditorData {
  editor: editor.IStandaloneCodeEditor;
  monaco: Monaco;
  disposables: IDisposable[];
}
