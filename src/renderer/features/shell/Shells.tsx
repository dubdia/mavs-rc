import { useAppDispatch } from "../../store/store";
import { Button, ButtonGroup } from "@nextui-org/react";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";
import { FaPaste, FaPlus } from "react-icons/fa6";
import { Tooltip } from "../../components/Tooltip";
import { FaCopy, FaTimes } from "react-icons/fa";
import { useShells } from "./shells.hook";
import { Shell } from "./Shell";
import { useRef, useState } from "react";
import { useAsyncEffect } from "../../utils/useAsyncEffect";

export const Shells = ({ id }: { id: string }) => {
  console.log("RENDER Shells", id);
  const appDispatch = useAppDispatch();
  const shells = useShells(id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shellRef = useRef<any>();
  const [addingFirstShell, setAddingFirstShell] = useState(false);

  useAsyncEffect(async () => {
    if (!addingFirstShell && shells.list().length == 0) {
      setAddingFirstShell(true);
      await shells.addFirstOrDoNothing();
    }
  }, [appDispatch]);

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
                onClick={() => shells.select(shell.shellId)}
              >
                #{index + 1}
              </Button>
            ))}
          </ButtonGroup>
          <div className="flex-1"></div>

          {/* Copy Clipboard */}
          {shells.get() && (
            <Tooltip content="Copies the current selection to the clipboard">
              <Button isIconOnly={true} variant="flat" onClick={() => shellRef?.current?.copyToClipboard()}>
                <FaCopy></FaCopy>
              </Button>
            </Tooltip>
          )}
          {/* Paste Clipboard */}
          {shells.get() && (
            <Tooltip content="Writes the content of the clipboard to the shell">
              <Button isIconOnly={true} variant="flat" onClick={() => shellRef?.current?.pasteFromClipboard()}>
                <FaPaste></FaPaste>
              </Button>
            </Tooltip>
          )}
          {/* Closes the current shell */}
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
                <Shell
                  ref={shellRef}
                  key={"shell-" + shells.get().shellId}
                  id={id}
                  shellId={shells.get().shellId}
                ></Shell>
              </div>
            </div>
          </div>
        )
      }
    ></HeaderScrollBodyLayout>
  );
};
