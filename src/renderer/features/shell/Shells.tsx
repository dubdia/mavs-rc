import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { Autocomplete, AutocompleteItem, Button, ButtonGroup } from "@nextui-org/react";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FaPlay, FaPlus, FaTrash } from "react-icons/fa6";
import { Tooltip } from "../../components/Tooltip";
import { FaSave, FaTimes } from "react-icons/fa";
import { useShells } from "./shells.hook";
import { Shell } from "./Shell";

export const Shells = ({ id }: { id: string }) => {
  console.log("RENDER Shells", id);
  const appDispatch = useAppDispatch();
  const shells = useShells(id);

  return (
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-2 items-center">
          {/* Add Shell */}
          <Tooltip content="Create a new shell">
            <Button isIconOnly={true} variant="flat" onClick={shells.add}>
              <FaPlus></FaPlus>
            </Button>
          </Tooltip>

          {/* Select Shell //todo delete button not always working, bug in nextui? */}
          <ButtonGroup>
            {shells.list().map((shell, index) => (
              <Button
                key={shell.shellId}
                color={shell == shells.get() ? "primary" : "default"}
                onClick={(x) => shells.select(shell.shellId)}
              >
                #{index + 1}
              </Button>
            ))}
          </ButtonGroup>

          {/* Closes the current shell */}
          <div className="flex-1"></div>
          {shells.get() && (
            <Tooltip content="Removes the current shell">
              <Button
                isIconOnly={true}
                variant="flat"
                onClick={() => shells.remove(shells.get().shellId)}
                className="hover:bg-red-500"
              >
                <FaTimes></FaTimes>
              </Button>
            </Tooltip>
          )}
        </div>
      }
      bodyScrollable={false}
      body={
        shells.get() && (
          <div className="w-full h-full max-h-full flex flex-col gap-4 pb-4">
            <div className="flex-1 relative">
              <div className="absolute top-0 left-0 right-0 bottom-0">
                <Shell key={"shell-" + shells.get().shellId} id={id} shellId={shells.get().shellId}></Shell>
              </div>
            </div>
          </div>
        )
      }
    ></HeaderScrollBodyLayout>
  );
};
