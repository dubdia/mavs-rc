import {
  Button,
  Card,
  CardBody,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useEffect } from "react";
import { FaPen, FaPlay, FaPlus, FaSearch, FaStop, FaTrash } from "react-icons/fa";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import {
  editSessionTunnel,
  processSessionServices,
  processSessionTunnels,
  sessionFetchTunnels,
} from "../../store/remotesSlice";
import { FaArrowsRotate } from "react-icons/fa6";
import { useTunnels } from "./tunnels.hook";
import { TunnelModal } from "./TunnelModal";
import { RemoteTunnelDto } from "../../../shared/models/RemoteTunnelDto";

export const Tunnels = ({ id }: { id: string }) => {
  console.log("RENDER Tunnels");

  // use store
  const dispatch = useAppDispatch();
  const tunnels = useRemoteSelector(id, (r) => r.session.tunnels);
  const editTunnelId = useRemoteSelector(id, (r) => r.session.tunnels.editTunnelId);

  const actions = useTunnels(id);
  console.log("RENDER Tunnels", editTunnelId);
  const isEditingThis = (tunnel: RemoteTunnelDto): boolean => {
    return editTunnelId != null && editTunnelId == tunnel?.info?.id;
  };

  // initially load
  useEffect(() => {
    dispatch(sessionFetchTunnels(id));
  }, [dispatch]);

  // html
  return (
    <>
      <div className="w-full">
        {/* Header */}
        <Card className="mb-4">
          <CardBody>
            <div className="flex flex-row gap-4 items-center">
              {/* Search */}
              <Input
                isClearable
                classNames={{
                  inputWrapper: "border-1",
                }}
                placeholder="Search by name..."
                startContent={<FaSearch className="text-default-300" />}
                value={tunnels.searchText}
                variant="bordered"
                isDisabled={tunnels.loading}
                onClear={() => dispatch(processSessionServices({ id: id, params: { searchText: "" } }))}
                onValueChange={(x) => dispatch(processSessionTunnels({ id: id, params: { searchText: x } }))}
              />

              {/* Refresh Button */}
              <Button
                isIconOnly
                variant="flat"
                isDisabled={tunnels.loading}
                onClick={() => dispatch(sessionFetchTunnels(id))}
              >
                <FaArrowsRotate />
              </Button>

              {/* Action Button */}
              <Button isIconOnly variant="flat" isDisabled={tunnels.loading} onClick={() => actions.addTunnel()}>
                <FaPlus></FaPlus>
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Services Table */}
        <Table
          key={Date.now()}
          aria-label="List of services"
          sortDescriptor={tunnels.sortDescriptor}
          onSortChange={(s) => processSessionTunnels({ id: id, params: { sortDescriptor: s } })}
        >
          <TableHeader>
            <TableColumn key="name" allowsSorting={true}>
              NAME
            </TableColumn>
            <TableColumn key="local" allowsSorting={true} width={120}>
              LOCAL PORT
            </TableColumn>
            <TableColumn key="remote" allowsSorting={true} width={120}>
              REMOTE ADDRESS
            </TableColumn>
            <TableColumn className="pl-0 pr-0" width={50}> </TableColumn>
          </TableHeader>
          <TableBody items={tunnels.filtered} isLoading={tunnels.loading} loadingContent={<Spinner color="white" />}>
            {(item) => (
              <TableRow key={item.info?.id ?? "no-id"}>
                <TableCell className="font-bold">{item.info?.name}</TableCell>
                <TableCell>
                  {item.info?.localPort}
                </TableCell>
                <TableCell>
                  {item.info?.remoteAddress}:{item.info?.remotePort}
                </TableCell>
                <TableCell className="flex flex-row gap-2">
                  {/* Connect Button */}
                  {!item.connected && !isEditingThis(item) && (
                    <Button
                      isIconOnly
                      variant="flat"
                      isDisabled={tunnels.loading}
                      onClick={() => actions.connectTunnel(item.info?.id!)}
                    >
                      <FaPlay></FaPlay>
                    </Button>
                  )}

                  {/* Disconnect Button */}
                  {item.connected && !isEditingThis(item) && (
                    <Button
                      isIconOnly
                      variant="flat"
                      isDisabled={tunnels.loading}
                      onClick={() => actions.destroyTunnel(item.info!.id!)}
                    >
                      <FaStop></FaStop>
                    </Button>
                  )}

                  {/* Edit Button */}
                  {!item.connected && !isEditingThis(item) && (
                    <Button
                      isIconOnly
                      variant="flat"
                      isDisabled={tunnels.loading}
                      onClick={() => dispatch(editSessionTunnel({ id: id, editTunnelId: item.info!.id! }))}
                    >
                      <FaPen></FaPen>
                    </Button>
                  )}

                  {/* Save Button */}
                  {isEditingThis(item) && (
                    <Button
                      isIconOnly
                      variant="flat"
                      isDisabled={tunnels.loading}
                      onClick={() => actions.updateTunnel(item.info!)}
                    >
                      <FaPen></FaPen>
                    </Button>
                  )}

                  {/* Remove Button */}
                  {!item.connected && !isEditingThis(item) && (
                    <Button
                      isIconOnly
                      variant="flat"
                      isDisabled={tunnels.loading}
                      onClick={() => actions.removeTunnel(item.info?.id!)}
                    >
                      <FaTrash></FaTrash>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {editTunnelId != null && (
        <TunnelModal
          id={id}
          tunnelId={editTunnelId}
          onClose={() => dispatch(editSessionTunnel({ id: id, editTunnelId: null }))}
        ></TunnelModal>
      )}
    </>
  );
};
