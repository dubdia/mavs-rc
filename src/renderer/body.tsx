import { RemoteInfoList } from "./components/RemoteInfoList";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/store";
import { loadRemotes } from "./store/remotesSlice";
import { Divider, Spinner } from "@nextui-org/react";
import { RemoteWrapper } from "./features/remotes/RemoteWrapper";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { ipc } from "./app";
import { useAsyncEffect } from "./utils/useAsyncEffect";
export default function Body() {
  console.log("RENDER Body");

  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.data.dataStatus);
  const remoteIds = useAppSelector((state) => state.data.data.ids);

  // initial fetch
  useEffect(() => {
    if (status == "new" || status == "rejected") {
      console.log("RENDER Body => START LOAD REMOTES", status);
      dispatch(loadRemotes());
    }
  }, [dispatch]);

  // get app version
  const [version, setVersion] = useState("Loading...");
  useAsyncEffect(async () => {
    try {
      const appVersion = await ipc.invoke("getAppVersion");
      setVersion(appVersion);
    } catch (err) {
      console.error("failed to get version", err);
      setVersion("Unknown version");
    }
  }, []);

  // check status
  if (status == "new" || status == "pending") {
    return <Spinner></Spinner>;
  } else if (status == "rejected") {
    return <p>Error loading data</p>;
  } else if (status != "fulfilled" || remoteIds == null) {
    return <p>Error loading data: Unknown status</p>;
  }

  // build remotes
  var remoteNodes = [];
  for (let remoteId of remoteIds) {
    remoteNodes.push(<RemoteWrapper key={remoteId} id={remoteId}></RemoteWrapper>);
  }

  return (
    <main className="absolute top-0 left-0 right-0 bottom-0 flex flex-row">
      {/* Menu Bar on the left */}
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { theme: "os-theme-light", autoHide: "leave" } }}
        className="py-4 pl-4 pr-4"
      >
        <div className="flex flex-col gap-4 h-full">
          {/* Remotes */}
          <RemoteInfoList></RemoteInfoList>
          <div className="flex-1"></div>

          {/* Information */}
          <Divider></Divider>
          <div className="flex flex-col gap-2 text-sm text-gray-400 min-h-10">
            <p className=" text-left">v{version}</p>
          </div>
        </div>
      </OverlayScrollbarsComponent>

      {/* Divider */}
      <div className="h-full py-4 mr-4">
        <Divider orientation="vertical"></Divider>
      </div>

      {/* Body in the center */}
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { theme: "os-theme-light", autoHide: "leave" } }}
        className="flex-1"
      >
        {remoteNodes}
      </OverlayScrollbarsComponent>
    </main>
  );
}
