import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { useRemoteSelector } from "../../store/store";
import { useTunnels } from "./tunnels.hook";
import { useState } from "react";

export const TunnelModal = ({ id, tunnelId, onClose }: { id: string; tunnelId: string; onClose: () => void }) => {
  console.log("RENDER TunnelModal", id);
  const actions = useTunnels(id);

  // get tunnel
  const originalTunnel = useRemoteSelector(id, (r) =>
    r.session.tunnels.original.find((x) => x.info?.id == tunnelId)
  )?.info;
  if (originalTunnel == null) {
    return <p>Tunnel with ID was not found!</p>;
  }
  const [tunnel, setTunnel] = useState({ ...originalTunnel });

  const hasChanged = () => JSON.stringify(originalTunnel) !== JSON.stringify(tunnel);

  // html
  return (
    <Modal isOpen={true} onClose={onClose} backdrop="blur" size="md">
      <ModalContent>
        <>
          <ModalHeader>{originalTunnel.name}</ModalHeader>
          <ModalBody className="flex flex-col gap-2">
            <div className="flex flex-row gap-2">
              <Input
                label="Name"
                className="w-full"
                type="text"
                maxLength={64}
                value={tunnel.name}
                onValueChange={(x) => setTunnel({ ...tunnel, name: x })}
              ></Input>
              <Input
                label="Local Port"
                className="w-36"
                type="number"
                min={1}
                max={65535}
                value={tunnel.localPort?.toString()}
                onValueChange={(x) => setTunnel({ ...tunnel, localPort: +x })}
              ></Input>
            </div>
            <div className="flex flex-row gap-2">
              <Input
                label="Remote Host"
                className="w-full"
                type="text"
                maxLength={64}
                value={tunnel.remoteAddress}
                onValueChange={(x) => setTunnel({ ...tunnel, remoteAddress: x })}
              ></Input>
              <Input
                label="Remote Port"
                className="w-36"
                type="number"
                min={1}
                max={65535}
                value={tunnel.remotePort?.toString()}
                onValueChange={(x) => setTunnel({ ...tunnel, remotePort: +x })}
              ></Input>
            </div>
          </ModalBody>
          <ModalFooter className="items-center gap-4">
            <Checkbox
              isSelected={tunnel.autoConnectOnLogin == true}
              onValueChange={(x) => setTunnel({ ...tunnel, autoConnectOnLogin: x == true })}
            >
              Auto connect on login
            </Checkbox>
            <Checkbox
              isSelected={tunnel.socks == true}
              onValueChange={(x) => setTunnel({ ...tunnel, socks: x == true })}
            >
              Socks
            </Checkbox>
            <div className="flex-1"></div>
            <Button color="primary" onClick={() => actions.updateTunnel(tunnel)} isDisabled={!hasChanged()}>
              Save
            </Button>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
};
