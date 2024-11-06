import { useAppDispatch } from "../../store/store";
import { Autocomplete, AutocompleteItem, Button, Spinner } from "@nextui-org/react";
import { sessionFetchScripts } from "../../store/remotesSlice";
import { Script } from "./Script";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FaPlay, FaPlus, FaTrash } from "react-icons/fa6";
import { Tooltip } from "../../components/Tooltip";
import { FaSave } from "react-icons/fa";
import { useScripts } from "./scripts.hook";

export const Scripts = ({ id }: { id: string }) => {
  console.log("RENDER Scripts", id);
  const appDispatch = useAppDispatch();
  const scripts = useScripts(id);

  // load scripts if there are none
  useAsyncEffect(async () => {
    if (scripts.scripts.length == 0) {
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
            defaultItems={scripts.scripts}
            placeholder="Select a script"
            variant="bordered"
            allowsCustomValue={false}
            isClearable={true}
            selectedKey={scripts.script?.name}
            onSelectionChange={scripts.selectScript}
          >
            {(script) => (
              <AutocompleteItem key={script.name} textValue={script.name}>
                {script.name}
              </AutocompleteItem>
            )}
          </Autocomplete>
          {/* Delete the script */}
          {scripts.script?.name && (
            <Tooltip content="Delete the current script">
              <Button
                isIconOnly={true}
                variant="flat"
                onClick={() => scripts.removeScript(scripts.script?.name)}
                className="hover:bg-red-500"
              >
                <FaTrash></FaTrash>
              </Button>
            </Tooltip>
          )}
          <div className="flex-1"></div>

          {/* Saves the script */}
          {scripts.script?.name && (
            <Tooltip content="Saves the current script">
              <Button isIconOnly={true} variant="flat" onClick={() => scripts.saveScript(scripts.script.name)}>
                <FaSave></FaSave>
              </Button>
            </Tooltip>
          )}

          {/* Execute the script */}
          {scripts.script?.name && (
            <Tooltip content="Saves and executes the current script">
              <Button
                isIconOnly={true}
                variant="flat"
                disabled={scripts.script.running || !scripts.script.contents}
                onClick={() => scripts.saveAndExecuteScript(scripts.script.name)}
                color="success"
              >
                {scripts.script.running || !scripts.script.contents ? <Spinner></Spinner> : <FaPlay></FaPlay>}
              </Button>
            </Tooltip>
          )}
        </div>
      }
      bodyScrollable={false}
      body={
        scripts.script && (
          <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
            <div className="flex-1 relative">
              <div className="absolute top-0 left-0 right-0 bottom-0">
                <Script key={"script-" + scripts.script.name} id={id} name={scripts.script.name}></Script>
              </div>
            </div>
          </div>
        )
      }
    ></HeaderScrollBodyLayout>
  );
};
