import {
  Button,
  Checkbox,
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
import { FaFolderOpen, FaPlus, FaSearch } from "react-icons/fa";
import { useAppDispatch, useRemote } from "../../store/store";
import { processSessionServices, sessionFetchServices } from "../../store/remotesSlice";
import { FaArrowsRotate } from "react-icons/fa6";
import { useServices } from "./services.hook";
import { ServicesDropdown } from "./ServicesDropdown";
import { ShortcutsToggle } from "../shortcuts/ShortcutsToggle";
import { ShortcutsDropdown } from "../shortcuts/ShortcutsDropdown";
import { HeaderScrollBodyLayout } from "../../components/HeaderScrollBodyLayout";

export const Services = ({ id }: { id: string }) => {
  //console.log("RENDER Services");

  // use store
  const dispatch = useAppDispatch();
  const remote = useRemote(id);
  const services = useServices(id);

  // initially load
  useEffect(() => {
    dispatch(sessionFetchServices(id));
  }, [dispatch]);

  const handleSelectInactive = (showInactive: boolean) => {
    if (showInactive == true) {
      dispatch(
        processSessionServices({
          id: id,
          params: { removeFilter: "active" },
        })
      );
    } else {
      dispatch(
        processSessionServices({
          id: id,
          params: { addFilter: { column: "active", value: "inactive", operator: "notEquals" } },
        })
      );
    }
  };

  // html
  return (
    <HeaderScrollBodyLayout
      header={
        <div className="flex flex-row gap-4 items-center">
          {/* Search */}
          <Input
            isClearable
            classNames={{
              inputWrapper: "border-1",
            }}
            placeholder="Search by name..."
            startContent={<FaSearch className="text-default-300" />}
            value={remote.session.services.searchText}
            variant="bordered"
            isDisabled={services.loading}
            onClear={() => dispatch(processSessionServices({ id: id, params: { searchText: "" } }))}
            onValueChange={(x) => dispatch(processSessionServices({ id: id, params: { searchText: x } }))}
          />
          {/* Filter for Inactive */}
          <Checkbox
            className="flex-shrink-0"
            isDisabled={services.loading}
            isSelected={remote.session.services.filters.find((x) => x.column == "active") == null}
            onValueChange={(e) => handleSelectInactive(e)}
          >
            Inactive
          </Checkbox>

          {/* Shortcuts */}
          <ShortcutsDropdown key="services-shortcuts"  id={id} type={"service"}></ShortcutsDropdown>

          {/* Refresh Button */}
          <Button
            isIconOnly
            variant="flat"
            isDisabled={services.loading}
            onClick={() => dispatch(sessionFetchServices(id))}
          >
            <FaArrowsRotate />
          </Button>

          {/* Go to Services Button */}
          <Button isIconOnly variant="flat" isDisabled={services.loading} onClick={() => services.goToServiceFolder()}>
            <FaFolderOpen />
          </Button>

          {/* Action Button */}
          <Button isIconOnly variant="flat" isDisabled={services.loading} onClick={() => services.createNewService()}>
            <FaPlus></FaPlus>
          </Button>
        </div>
      }
      body={
        <Table
          aria-label="List of services"
          sortDescriptor={remote.session.services.sortDescriptor}
          onSortChange={(s) => processSessionServices({ id: id, params: { sortDescriptor: s } })}
        >
          <TableHeader>
            <TableColumn key="shortcut" allowsSorting={false} width="0">
              {" "}
            </TableColumn>
            <TableColumn key="name" allowsSorting={true} width="100%">
              NAME
            </TableColumn>
            <TableColumn key="load" allowsSorting={true}>
              LOAD
            </TableColumn>
            <TableColumn key="active" allowsSorting={true}>
              ACTIVE
            </TableColumn>
            <TableColumn key="sub" allowsSorting={true}>
              SUB
            </TableColumn>
            <TableColumn className="pl-0 pr-0 w-0"> </TableColumn>
          </TableHeader>
          <TableBody
            items={remote.session.services.filtered}
            isLoading={remote.session.services.loading}
            loadingContent={<Spinner color="white" />}
          >
            {(item) => (
              <TableRow key={item.name}>
                <TableCell>
                  <ShortcutsToggle id={id} type={"service"} value={item.name}></ShortcutsToggle>
                </TableCell>
                <TableCell className="font-bold cursor-pointer" onClick={() => services.editService(item.name)}>
                  {item.name}
                </TableCell>
                <TableCell>{item.load}</TableCell>
                <TableCell className={item.active == "failed" ? "text-red-700" : ""}>{item.active}</TableCell>
                <TableCell className={item.sub == "running" ? "text-green-700" : ""}>{item.sub}</TableCell>
                <TableCell>
                  {/* actions for a service */}
                  <>
                    <ServicesDropdown id={id} serviceName={item.name} />
                  </>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      }
    ></HeaderScrollBodyLayout>
  );
};
