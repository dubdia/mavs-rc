import { useAppDispatch, useRemoteSelector } from "../../store/store";
import {
  Autocomplete,
  AutocompleteItem,
  Avatar,
  Button,
  Card,
  CardBody,
  Divider,
  Tab,
  tabs,
  Tabs,
} from "@nextui-org/react";
import {
  selectScript,
  sessionCreateScript,
  sessionDeleteScript,
  sessionExecuteScript,
  sessionFetchScripts,
  sessionUpdateScript,
} from "../../store/remotesSlice";
import { Script } from "./Script";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { useInput } from "../../components/dialogs/InputDialog";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FaPlay, FaPlus, FaXmark } from "react-icons/fa6";
import { ScriptInfo } from "../../../main/models/Script";
import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { Tooltip } from "../../components/Tooltip";
import { FaSave } from "react-icons/fa";

export const Scripts = ({ id }: { id: string }) => {
  console.log("RENDER Scripts", id);
  const input = useInput();
  const confirm = useConfirm();
  const appDispatch = useAppDispatch();
  const scripts = useRemoteSelector(id, (r) => r.session.scripts);
  const editScriptId = useRemoteSelector(id, (r) => r.session.scripts.editScriptId);

  useAsyncEffect(async () => {
    await appDispatch(sessionFetchScripts(id));
  }, [appDispatch]);

  const addScript = async () => {
    try {
      let nameOk = false;
      let name: string = null;
      while (!nameOk) {
        name = await input({
          title: "Add new script",
          message: "Enter name of the script",
          yes: "Create",
        });
        name = name?.trim();
        if (name == null || name == "") {
          return;
        }

        if (scripts.original.find((x) => x.name.trim().toLowerCase() == name.toLowerCase())) {
          toast.warn("A script with that name already exists");
        } else if (name.length > 64) {
          toast.warn("Name of the script is too long");
        } else {
          nameOk = true;
        } //todo check for invalid chars
      }

      await appDispatch(sessionCreateScript({ id: id, scriptName: name }));
      toast.success("Created " + name);
    } catch (err) {
      console.error("failed to create script", err);
      toast.error("Failed to create new script");
    }
  };
  const removeScript = async (script: ScriptInfo) => {
    if (script == null || script.scriptId == null) {
      return;
    }
    try {
      // confirm
      const ok = await confirm({
        title: "Delete Script " + script.name + "?",
        yes: "Delete",
      });
      if (ok !== true) {
        return;
      }

      // remove
      await appDispatch(sessionDeleteScript({ id: id, scriptId: script.scriptId }));
      toast.success("Deleted " + script.name);
    } catch (err) {
      console.error("failed to delete script", script, err);
      toast.error("Failed to delete");
    }
  };
  const selectScriptById = (scriptId: string) => {
    appDispatch(selectScript({ id: id, scriptId: scriptId }));
  };
  const saveAndExecuteScript = async () => {
    // get script
    const script = scripts.original.find((x) => x.scriptId == editScriptId);
    if (script == null) {
      return;
    }

    // save current
    await appDispatch(sessionUpdateScript({ id: id, script: script }));

    // check
    if (script == null || script.content == "") {
      toast.warn("Please enter a script first");
    }

    // try to execute
    try {
      await appDispatch(sessionExecuteScript({ id: id, scriptId: script.scriptId }));
    } catch (err) {
      console.error("failed to execute script", err);
      toast.error("Failed to execute script: " + err?.toString());
    }
  };

  return (
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-2 items-center">
          {/* Add Script */}
          <Tooltip content="Create a new script">
            <Button isIconOnly={true} variant="flat" onClick={addScript}>
              <FaPlus></FaPlus>
            </Button>
          </Tooltip>
          <Divider orientation="vertical"></Divider>

          {/* Select Script //todo delete button not always working, bug in nextui? */}
          <Autocomplete
            aria-label="Selected script"
            className="max-w-64"
            defaultItems={scripts.original}
            placeholder="Select a script"
            variant="bordered"
            allowsCustomValue={false}
            isClearable={false}
            listboxProps={{
              hideSelectedIcon: true,
            }}
            selectedKey={editScriptId}
            onSelectionChange={selectScriptById}
          >
            {(script) => (
              <AutocompleteItem
                key={script.scriptId}
                textValue={script.name}
                endContent={
                  <Button isIconOnly={true} size="sm">
                    <FaXmark onClick={() => removeScript(script)}></FaXmark>
                  </Button>
                }
              >
                {script.name}
              </AutocompleteItem>
            )}
          </Autocomplete>
          <div className="flex-1"></div>

          {/* Saves the script */}
          {editScriptId && (
            <Tooltip content="Saves the script">
              <Button isIconOnly={true} variant="flat" onClick={saveAndExecuteScript}>
                <FaSave></FaSave>
              </Button>
            </Tooltip>
          )}

          {/* Execute the script */}
          {editScriptId && (
            <Tooltip content="Saves and executes script">
              <Button isIconOnly={true} variant="flat" onClick={saveAndExecuteScript} color="success">
                <FaPlay></FaPlay>
              </Button>
            </Tooltip>
          )}
        </div>
      }
      bodyScrollable={false}
      body={
        editScriptId && (
          <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
            <div className="flex-1 relative">
              <div className="absolute top-0 left-0 right-0 bottom-0">
                <Script key={"script-" + editScriptId} id={id} scriptId={editScriptId}></Script>
              </div>
            </div>
          </div>
        )
      }
    ></HeaderScrollBodyLayout>
  );
};
