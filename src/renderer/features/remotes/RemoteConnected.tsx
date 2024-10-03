import { Button, Tab, Tabs, Tooltip } from "@nextui-org/react";
import { Services } from "../services/Services";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { closeRemote, setSelectedTab } from "../../store/remotesSlice";
import { Shell } from "../shell/Shell";
import { Files } from "../files/Files";
import { FileEditor } from "../files/FileEditor";
import { FaCircleNodes, FaFolderTree, FaLayerGroup, FaServicestack, FaTerminal, FaXmark } from "react-icons/fa6";
import { memo } from "react";
import { Layout } from "../../components/Layout";
import { FaInfo, FaTimes } from "react-icons/fa";
import { Info } from "../info/Info";
import { Tunnels } from "../tunnel/Tunnels";
import { TabName } from "../../models/TabName";
import { IconType } from "react-icons";

export interface TabInfo {
  name: TabName;
  label?: string | undefined;
  closable?: boolean;
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
      label: "Info",
      render: () => <Info key={"info" + id} id={id}></Info>,
    },
    {
      name: "tunnels",
      icon: FaCircleNodes,
      label: "Tunnels",
      render: () => <Tunnels key={"tunnels" + id} id={id}></Tunnels>,
    },
    {
      name: "shell",
      icon: FaTerminal,
      label: "Shell",
      render: () => <Shell key={"shell" + id} id={id}></Shell>,
    },
    {
      name: "services",
      icon: FaLayerGroup,
      label: "Services",
      render: () => <Services key={"services" + id} id={id}></Services>,
    },
    {
      name: "files",
      icon: FaFolderTree,
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

  const renderSelectedTab = (): React.ReactNode => {
    const body = tabs.find((x) => x.name == selectedTab)?.render();
    if (body == null) {
      return <p>Tab not found.</p>;
    } else {
      return body;
    }
  };

  const renderTabHeader = (tabInfo: TabInfo): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    if(tabInfo.icon) {
      parts.push(<tabInfo.icon/>)
    }
    if(tabInfo.label) {
      parts.push(<span>{tabInfo.label}</span>)
    }
    /*if(tabInfo.closable) {
      parts.push(<Button color="default" size="sm" variant="light" isIconOnly={true}><FaTimes></FaTimes></Button>)
    }*/

    return <span className="select-none flex flex-row gap-2 items-center">{...parts}</span>
  };

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
            placement="top"
            aria-label="Tabs"
            variant="underlined"
            size="lg"
            selectedKey={selectedTab}
            onSelectionChange={(key) => dispatch(setSelectedTab({ id: id, key: key as any }))}
            items={tabs}
          >
            {(item) => <Tab key={item.name} title={renderTabHeader(item)}></Tab>}
          </Tabs>

          {/* Selected tab fills the bottom */}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 right-0 bottom-0">{renderSelectedTab()}</div>
          </div>
        </div>
      }
    />
  );
});
