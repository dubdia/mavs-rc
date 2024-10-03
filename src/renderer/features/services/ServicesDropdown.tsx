import { Dropdown, DropdownTrigger, Button, DropdownMenu, DropdownSection, DropdownItem } from "@nextui-org/react";
import { FaBars } from "react-icons/fa";
import { useServices } from "./services.hook";

export const ServicesDropdown = ({
  id,
  serviceName,
  dropdownTrigger = null,
}: {
  id: string;
  serviceName: string;
  dropdownTrigger?: React.ReactNode;
}) => {
  const services = useServices(id);
  dropdownTrigger = dropdownTrigger ?? (
    <Button isIconOnly variant="light">
      <FaBars></FaBars>
    </Button>
  );

  return (
    <Dropdown backdrop="blur">
      <DropdownTrigger>{dropdownTrigger}</DropdownTrigger>
      {/* generic actions */}
      <DropdownMenu aria-label="Static Actions">
        <DropdownSection title={serviceName}>
          <DropdownItem key="start" onClick={() => services.startService(serviceName)}>
            Start
          </DropdownItem>
          <DropdownItem key="stop" onClick={() => services.stopService(serviceName)}>
            Stop
          </DropdownItem>
          <DropdownItem key="restart" onClick={() => services.restartService(serviceName)}>
            Restart
          </DropdownItem>
          <DropdownItem key="enable" onClick={() => services.enableService(serviceName)}>
            Enable
          </DropdownItem>
          <DropdownItem key="disable" onClick={() => services.disableService(serviceName)}>
            Disable
          </DropdownItem>
          <DropdownItem key="delete" onClick={() => services.deleteService(serviceName)}>
            Delete
          </DropdownItem>
          <DropdownItem key="edit" onClick={() => services.editService(serviceName)}>
            Edit
          </DropdownItem>
        </DropdownSection>

        {/* logging actions */}
        <DropdownSection title="Logs & Status">
          <DropdownItem key="log_current_boot" onClick={() => services.viewServiceLogSinceBoot(serviceName)}>
            Log since boot
          </DropdownItem>
          <DropdownItem key="output_overall" onClick={() => services.viewServiceLog(serviceName)}>
            Log
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};
