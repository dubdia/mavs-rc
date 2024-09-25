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

export const RemoteConnected = memo(({ id }: { id: string }) => {
  console.log("RENDER RemoteConnected");

  const dispatch = useAppDispatch();
  const name = useRemoteSelector(id, (r) => r.dto.info?.name ?? "Unnamed");
  const selectedTab = useRemoteSelector(id, (r) => r.session.selectedTab);
  const files = useRemoteSelector(id, (r) => r.session.files);

  return (
    <Layout
      name={name}
      header={
        <Tooltip
          color="foreground"
          offset={25}
          content="Closes the connection to the remote"
        >
          <Button isIconOnly={true} variant="light" onClick={() => dispatch(closeRemote(id))}>
            <FaXmark />
          </Button>
        </Tooltip>
      }
      body={
        <Tabs
          aria-label="Tabs"
          variant="underlined"
          size="lg"
          selectedKey={selectedTab}
          onSelectionChange={(key) => dispatch(setSelectedTab({ id: id, key: key as any }))}
        >
          <Tab key={"info" as TabName} title={<FaInfo className="select-none" />}>
            <Info key={id} id={id}></Info>
          </Tab>
          <Tab key={"tunnels" as TabName} title={<FaCircleNodes className="select-none" />}>
            <Tunnels key={id} id={id}></Tunnels>
          </Tab>
          <Tab key={"shell" as TabName} title={<span className="select-none">Shell</span>}>
            <Shell key={id} id={id}></Shell>
          </Tab>
          {/*<Tab key="command" title="Command">
    <RemoteSessionExecuteCommand key={id} id={id}></RemoteSessionExecuteCommand>
</Tab>*/}
          <Tab key={"services" as TabName} title={<span className="select-none">Services</span>}>
            <Services key={id} id={id}></Services>
          </Tab>
          <Tab key={"files" as TabName} title={<span className="select-none">Explorer</span>}>
            <Files key={id} id={id}></Files>
          </Tab>
          {files.map((file) => (
            <Tab key={file.tab} title={<span className="select-none">{file.name}</span>}>
              <FileEditor key={file.tab} id={id} fileTab={file.tab}></FileEditor>
            </Tab>
          ))}
        </Tabs>
      }
    />
  );
});
