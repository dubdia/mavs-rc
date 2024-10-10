import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { languages, editor } from "monaco-editor/esm/vs/editor/editor.api";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { useEffect, useState } from "react";
import scriptContextDefinitions from "../../../main/script-context-definitions?raw";
import { IDisposable } from "xterm";
import { Button, Card, CardBody, Tab, tabs, Tabs } from "@nextui-org/react";
import { ipc } from "../../app";
import { toast } from "react-toastify";
import { FaJs } from "react-icons/fa6";
import {
  selectScript,
  sessionCreateScript,
  sessionDeleteScript,
  sessionFetchScripts,
  setSelectedTab,
} from "../../store/remotesSlice";
import { useDispatch } from "react-redux";
import { Script } from "./Script";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { useInput } from "../../components/dialogs/InputDialog";

export const Scripts = ({ id }: { id: string }) => {
  console.log("RENDER Scripts", id);
  const input = useInput();
  const appDispatch = useAppDispatch();
  const scripts = useRemoteSelector(id, (r) => r.session.scripts);
  const editScriptId = useRemoteSelector(id, (r) => r.session.scripts.editScriptId);

  useAsyncEffect(async () => {
    await appDispatch(sessionFetchScripts(id));
  }, [appDispatch]);

  const addScript = async () => {
    const name = await input({
      title: "Add new script",
      message: "Enter name of the script",
      yes: "Create",
    });
    if (name == null || name == "") {
      return;
    }
    await appDispatch(sessionCreateScript({ id: id, scriptName: name }));
  };
  const removeScript = async (scriptId: string) => {
    await appDispatch(sessionDeleteScript({ id: id, scriptId: scriptId }));
  };

  return (
    <div className="w-full h-full pb-4">
      <Card className="h-full w-full">
        <CardBody>
          <div className="flex flex-row gap-2 h-full w-full ">
            {/* Tabs in the top part */}
            <div className="flex flex-col gap-2 h-full">
              <Tabs
                placement="start"
                aria-label="Tabs"
                variant="underlined"
                size="lg"
                selectedKey={editScriptId}
                onSelectionChange={(key) => appDispatch(selectScript({ id: id, scriptId: key.toString() }))}
                items={scripts.filtered}
              >
                {(item) => <Tab key={item.info.scriptId} title={item.info.name}></Tab>}
              </Tabs>
              <Button onClick={addScript}>Add Script</Button>
            </div>

            {/* Selected tab fills the bottom */}
            <div className="flex-1 relative">
              {editScriptId && (
                <div className="absolute top-0 left-0 right-0 bottom-0">
                  <Script key={"script-" + editScriptId} id={id} scriptId={editScriptId}></Script>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
