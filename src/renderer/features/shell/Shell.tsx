import { Card, CardBody } from "@nextui-org/react";
import { useRemoteSelector } from "../../store/store";
import XTerm from "../../components/XTerm";
import { useEffect, useRef } from "react";
import { Mutex } from "async-mutex";
import { computeColor } from "../../utils/computeColor";
import { ipc } from "../../app";

//let start: number;

export const Shell = ({ id }: { id: string }) => {
  const xtermRef = useRef<XTerm>(null);
  const remoteShell = useRemoteSelector(id, (r) => r.session.shell);
  const data = remoteShell.data ?? [];
  const dataIndex = useRef({ index: 0 });
  const mutex = useRef(new Mutex());

  console.log("RENDER Shell", dataIndex);

  const color = computeColor("hsl(var(--nextui-content1) / var(--nextui-content1-opacity, var(--tw-bg-opacity)));");

  // restore previous state / update state
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

  // when user writes data
  const handleData = (data: string) => {
    // check data & hub
    if (data == null || data == "") {
      return;
    }

    // send to socket
    start = new Date().getTime();
    ipc.invoke("sendShell", id, data);
  };

  return (
    <div className="w-full">
      {/* Remote Connection Info */}
      <Card className="mb-4">
        <CardBody>
          <XTerm
            key="xterm"
            ref={xtermRef}
            onData={handleData}
            options={{ cursorBlink: true, theme: { background: color }, allowTransparency: true, scrollback: 200 }}
          />
        </CardBody>
      </Card>
    </div>
  );
};
