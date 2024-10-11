import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { Autocomplete, AutocompleteItem, Button } from "@nextui-org/react";
import { sessionFetchScripts } from "../../store/remotesSlice";
import { Script } from "./Script";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { useInput } from "../../components/dialogs/InputDialog";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FaPlay, FaPlus, FaTrash } from "react-icons/fa6";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { Tooltip } from "../../components/Tooltip";
import { FaSave } from "react-icons/fa";
import { useScripts } from "./scripts.hook";

export const Scripts = ({ id }: { id: string }) => {
  console.log("RENDER Scripts", id);
  const appDispatch = useAppDispatch();
  const scripts = useScripts(id);
  const script = scripts.getCurrentScript();

  // load scripts if there are none
  useAsyncEffect(async () => {
    if (scripts.getScripts().length == 0) {
      await appDispatch(sessionFetchScripts(id));
    }
  }, [appDispatch]);

  return (
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-2 items-center">
          {/* Add Script */}
          <Tooltip content="Create a new script">
            <Button isIconOnly={true} variant="flat" onClick={scripts.addScript}>
              <FaPlus></FaPlus>
            </Button>
          </Tooltip>

          {/* Select Script //todo delete button not always working, bug in nextui? */}
          <Autocomplete
            aria-label="Selected script"
            className="max-w-64"
            defaultItems={scripts.getScripts()}
            placeholder="Select a script"
            variant="bordered"
            allowsCustomValue={false}
            isClearable={true}
            selectedKey={script?.scriptId}
            onSelectionChange={scripts.selectScript}
          >
            {(script) => (
              <AutocompleteItem key={script.scriptId} textValue={script.name}>
                {script.name}
              </AutocompleteItem>
            )}
          </Autocomplete>
          {/* Delete the script */}
          {script && (
            <Tooltip content="Delete the current script">
              <Button
                isIconOnly={true}
                variant="flat"
                onClick={() => scripts.removeScript(script.scriptId)}
                className="hover:bg-red-500"
              >
                <FaTrash></FaTrash>
              </Button>
            </Tooltip>
          )}
          <div className="flex-1"></div>

          {/* Saves the script */}
          {script && (
            <Tooltip content="Saves the current script">
              <Button isIconOnly={true} variant="flat" onClick={() => scripts.saveScript(script.scriptId)}>
                <FaSave></FaSave>
              </Button>
            </Tooltip>
          )}

          {/* Execute the script */}
          {script && (
            <Tooltip content="Saves and executes the current script">
              <Button
                isIconOnly={true}
                variant="flat"
                disabled={script.running || !script.content}
                onClick={() => scripts.saveAndExecuteScript(script.scriptId)}
                color="success"
              >
                <FaPlay></FaPlay>
              </Button>
            </Tooltip>
          )}
        </div>
      }
      bodyScrollable={false}
      body={
        script && (
          <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
            <div className="flex-1 relative">
              <div className="absolute top-0 left-0 right-0 bottom-0">
                <Script key={"script-" + script.scriptId} id={id} scriptId={script.scriptId}></Script>
              </div>
            </div>
          </div>
        )
      }
    ></HeaderScrollBodyLayout>
  );
};
