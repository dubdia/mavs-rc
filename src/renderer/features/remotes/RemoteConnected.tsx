import { Button, Tab, Tabs, Tooltip } from "@nextui-org/react";
import { Services } from "../services/Services";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { closeRemote, setSelectedTab } from "../../store/remotesSlice";
import { Shell } from "../shell/Shell";
import { Files } from "../files/Files";
import { FileEditor } from "../files/FileEditor";
import { FaCircleNodes, FaXmark } from "react-icons/fa6";
import { memo } from "react";
import { Layout } from "../../components/Layout";
import { FaInfo } from "react-icons/fa";
import { Info } from "../info/Info";
import { Tunnels } from "../tunnel/Tunnels";
import { TabName } from "../../models/TabName";
import { IconType } from "react-icons";

export interface TabInfo {
  name: TabName;
  label?: string | undefined;
  icon?: IconType | undefined;
  render: () => React.ReactNode;
}

export const RemoteConnected = memo(({ id }: { id: string }) => {
  console.log("RENDER RemoteConnected");

  const dispatch = useAppDispatch();
  const name = useRemoteSelector(id, (r) => r.dto.info?.name ?? "Unnamed");
  const selectedTab = useRemoteSelector(id, (r) => r.session.selectedTab);
  const files = useRemoteSelector(id, (r) => r.session.files);
  const tabs: TabInfo[] = [
    {
      name: "info",
      icon: FaInfo,
      render: () => <Info key={"info" + id} id={id}></Info>,
    },
    {
      name: "tunnels",
      icon: FaCircleNodes,
      render: () => <Tunnels key={"tunnels" + id} id={id}></Tunnels>,
    },
    {
      name: "shell",
      label: "Shell",
      render: () => <Shell key={"shell" + id} id={id}></Shell>,
    },
    {
      name: "services",
      label: "Services",
      render: () => <Services key={"services" + id} id={id}></Services>,
    },
    {
      name: "files",
      label: "Files",
      render: () => <Files key={"files" + id} id={id}></Files>,
    },
  ];
  for (let file of files) {
    tabs.push({
      name: file.tab,
      label: file.name,
      render: () => <FileEditor key={file.tab} id={id} fileTab={file.tab}></FileEditor>,
    });
  }

  return (
    <Layout
      name={name}
      header={
        <Tooltip color="foreground" offset={25} content="Closes the connection to the remote">
          <Button isIconOnly={true} variant="light" onClick={() => dispatch(closeRemote(id))}>
            <FaXmark />
          </Button>
        </Tooltip>
      }
      body={
        <div className="flex flex-col gap-2 h-full w-full ">
          {/* Tabs in the top part */}
          <Tabs
            aria-label="Tabs"
            variant="underlined"
            size="lg"
            selectedKey={selectedTab}
            onSelectionChange={(key) => dispatch(setSelectedTab({ id: id, key: key as any }))}
            items={tabs}
          >
            {(item) => (
              <Tab
                key={item.name}
                title={
                  <span className="select-none">{item.icon ? <item.icon className="select-none" /> : item.label}</span>
                }
              ></Tab>
            )}
          </Tabs>

          {/* Selected tab fills the bottom */}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 bottom-0">
              {tabs.find((x) => x.name == selectedTab).render()}
            </div>
          </div>
        </div>
      }
    />
  );
});
