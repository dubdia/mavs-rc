import { RemoteInfoList } from "./components/RemoteInfoList";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/store";
import { loadRemotes } from "./store/remotesSlice";
import { Button, Divider, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Spinner } from "@nextui-org/react";
import { RemoteWrapper } from "./features/remotes/RemoteWrapper";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { ipc } from "./app";
import { useAsyncEffect } from "./utils/useAsyncEffect";
import { Center } from "./components/Center";
import { FaBars, FaBurger, FaGithub } from "react-icons/fa6";
import { AppAction } from "../shared/ipc/ipc-api";
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
    return (
      <Center>
        <Spinner size="lg" />
      </Center>
    );
  } else if (status == "rejected") {
    return (
      <Center>
        <p>Error loading data</p>;
      </Center>
    );
  } else if (status != "fulfilled" || remoteIds == null) {
    return (
      <Center>
        <p>Error loading data: Unknown status</p>
      </Center>
    );
  }

  // build remotes
  var remoteNodes = [];
  for (let remoteId of remoteIds) {
    remoteNodes.push(<RemoteWrapper key={remoteId} id={remoteId}></RemoteWrapper>);
  }

  // add placeholder when no node was added
  if (remoteNodes.length == 0) {
    remoteNodes.push(
      <Center>
        <div className="flex flex-col gap-2 select-none">
          <span className="text-xl">Welcome to Mav's RC</span>
          <Divider></Divider>
          <span className="text-medium text-gray-300">
            Click on the top left button to add a new connection to a remote host
          </span>
        </div>
      </Center>
    );
  }

  // handlers
  const handleInvokeAction = async (action: AppAction) => {
    await ipc.invoke("invokeAction", action);
  };

  // render
  return (
    <main className="absolute top-0 left-0 right-0 bottom-0 flex flex-row">
      {/* Menu Bar on the left */}
      <div className="h-full flex flex-col pl-4 pr-4 gap-2">
        {/* Header */}
        <div className="flex flex-col justify-end h-[70px] ">
          <div className="flex flex-row  items-center h-full pt-4 pl-3 backdrop-blur-lg backdrop-saturate-150">
            <Dropdown>
              <DropdownTrigger>
                <Button variant="light" isIconOnly={true}>
                  <FaBars></FaBars>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Application actions">
                <DropdownItem key="openAppData" onClick={() => handleInvokeAction("openAppData")}>
                  Open app data folder
                </DropdownItem>
                <DropdownItem key="openAppConfig" onClick={() => handleInvokeAction("openAppConfig")}>
                  Open app config
                </DropdownItem>
                <DropdownItem key="openRemotesConfig" onClick={() => handleInvokeAction("openRemotesConfig")}>
                  Open remotes config
                </DropdownItem>
                <DropdownItem key="openLog" onClick={() => handleInvokeAction("openLog")}>
                  View logs
                </DropdownItem>
                <DropdownItem key="openGithub" onClick={() => handleInvokeAction("openGithub")}>
                  View on Github
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            {/*
            <span className="leading-none select-none opacity-55">Mav's RC</span>*/}
          </div>
          <Divider></Divider>
        </div>

        {/* Scollable Remote List */}
        <OverlayScrollbarsComponent
          defer
          options={{ scrollbars: { theme: "os-theme-light", autoHide: "leave" } }}
          className=" flex-1"
        >
          <div className="flex flex-col gap-4 h-full">
            {/* Remotes */}
            <RemoteInfoList></RemoteInfoList>
            <div className="flex-1"></div>
          </div>
        </OverlayScrollbarsComponent>
        <Divider></Divider>
        {/* Footer */}
        <div
          className="flex flex-row justify-between gap-2 text-sm text-gray-400 min-h-10 cursor-pointer"
          onClick={() => handleInvokeAction("openGithub")}
        >
          <span>v{version}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-full py-4 mr-4">
        <Divider orientation="vertical"></Divider>
      </div>

      {/* Body in the center */}
      <div className="flex-1 relative">{remoteNodes}</div>
    </main>
  );
}
