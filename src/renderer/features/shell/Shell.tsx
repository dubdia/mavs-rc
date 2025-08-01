import { Card, CardBody } from "@nextui-org/react";
import XTerm from "../../components/XTerm";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import debounce from "lodash.debounce";
import { Mutex } from "async-mutex";
import { computeColor } from "../../utils/computeColor";
import { ipc } from "../../app";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalSize } from "../../../shared/models/TerminalSize";
import { useShells } from "./shells.hook";
import { toast } from "react-toastify";

//let start: number;
const color = computeColor("hsl(var(--nextui-content1) / var(--nextui-content1-opacity, var(--tw-bg-opacity)));");
export const Shell = forwardRef(({ id, shellId }: { id: string; shellId: string }, ref) => {
  // use hooks
  const xtermRef = useRef<XTerm>(null);

  const dataIndex = useRef({ index: 0 });
  const mutex = useRef(new Mutex());
  const fitAddon = useRef(new FitAddon());

  // get shell from remote
  const shells = useShells(id);
  const remoteShell = shells.list().find((x) => x.shellId == shellId);
  if (remoteShell == null || remoteShell.shellId == null) {
    return <p>Shell not found: {shellId}</p>;
  }
  const data = remoteShell.data ?? [];
  //console.log("RENDER Shell", remoteShell);

  // register events on terminal
  useEffect(() => {
    const terminalElement = xtermRef.current?.terminalRef?.current;
    terminalElement?.addEventListener("contextmenu", handleRightClickPaste);
    return () => {
      terminalElement?.removeEventListener("contextmenu", handleRightClickPaste);
    };
  }, []);

  // fit terminal on resize
  useEffect(() => {
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  // initially fit size
  useEffect(() => {
    //console.log("useEffect", fitAddon.current.proposeDimensions());
    fitAddon.current.fit();
  }, []);

  /** restore previous state / update state */
  useEffect(() => {
    mutex.current.runExclusive(() => {
      const terminal = xtermRef.current?.terminal;
      if (terminal != null && data != null && data.length > 0) {
        const currentIndex = dataIndex.current.index;
        const dataCopy = [...data];
        dataIndex.current.index = dataCopy.length;
        for (let i = currentIndex; i < dataCopy.length; i++) {
          terminal.write(dataCopy[i]);
        }
      }

      //const end = new Date().getTime();
      //const t = end - start;
      //console.log("ms", t);
    });
  }, [data.length]);

  /** when user writes data */
  const handleData = (data: string) => {
    // check data
    if (data == null || data == "") {
      return;
    }

    // send to socket
    //start = new Date().getTime();
    ipc.invoke("sendShell", id, remoteShell.shellId, data);
  };

  /** handler to intercept right-clicks and paste clipboard contents */
  const handleRightClickPaste = async (event: UIEvent) => {
    event?.preventDefault(); // Prevent the default context menu
    fitAddon.current.fit();
    const text = await navigator.clipboard.readText();
    if (!text && text == "") {
      return;
    }
    const terminal = xtermRef.current.terminal;
    if (!terminal) {
      return;
    }
    terminal.paste(text); // or terminal.write(text), depending on what's available
  };

  /** tells xterm to fit to the new size (will trigger @see handleResize later) */
  const handleWindowResize = () => {
    debounceFit();
  };

  /** tell the remote shell that this xterm has resized */
  const handleResize = (size: TerminalSize) => {
    ipc.invoke("shellResize", id, remoteShell.shellId, size);
  };

  const debounceFit = debounce(() => {
    fitAddon?.current?.fit();
  }, 200);

  const copyToClipboard = async () => {
    const terminal = xtermRef.current.terminal;
    if (!terminal) {
      toast.warn("Terminal is not ready");
      return;
    }
    const selection = terminal.getSelection();
    if (selection == null || selection == "") {
      toast.warn("Selection is empty");
      return;
    }
    await navigator.clipboard.writeText(selection?.toString() ?? "");
    toast.info("Clipboard updated");
  };
  const pasteFromClipboard = async () => {
    const terminal = xtermRef.current.terminal;
    if (!terminal) {
      toast.warn("Terminal is not ready");
      return;
    }
    const text = await navigator.clipboard.readText();
    if (!text) {
      toast.warn("Clipboard is empty");
      return;
    }
    terminal.paste(text); // or terminal.write(text), depending on what's available
  };

  useImperativeHandle(ref, () => ({
    copyToClipboard,
    pasteFromClipboard,
  }));
  return (
    <div className="w-full h-full pb-4">
      {/* Remote Connection Info */}
      <Card className="w-full h-full mb-4 overflow-hidden">
        <CardBody className="w-full h-full overflow-hidden">
          <div className="w-full h-full relative">
            <XTerm
              onResize={(e) => handleResize({ cols: e.cols, rows: e.rows })}
              className="absolute top-0 left-0 right-0 bottom-0"
              key="xterm"
              ref={xtermRef}
              onData={handleData}
              addons={[fitAddon.current]}
              options={{
                cursorBlink: true,
                theme: { background: color },
                allowTransparency: true,
                scrollback: 200,
              }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
});
