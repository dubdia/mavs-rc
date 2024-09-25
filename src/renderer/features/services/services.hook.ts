import { toast } from "react-toastify";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { useInput } from "../../components/dialogs/InputDialog";
import { SessionService } from "src/renderer/models/SessionService";
import {
  addSessionFile,
  sessionFetchServices,
  sessionList,
  setSelectedTab,
} from "../../store/remotesSlice";
import { useAppDispatch, useRemote } from "../../store/store";
import { useState } from "react";
import { useInfo } from "../../components/dialogs/InfoDialog";
import { replaceAll } from "../../../shared/utils/replaceAll";
import { getFileTabName } from "../../utils/getFileTabName";
import { ipc } from "../../app";
import { joinPath } from "../../../shared/utils/io/joinPath";
import { createFile } from "../../models/SessionFile";
import { useFiles } from "../files/files.hook";

export const useServices = (id: string) => {
  const input = useInput();
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const info = useInfo();
  const files = useFiles(id);
  const remote = useRemote(id);
  const [loading, setLoading] = useState(false);

  const getServiceByName = (name: string): SessionService => {
    const service = remote.session.services.original.find((x) => x.name == name);
    if (service == null) {
      throw new Error("Unable to find service by name: " + name);
    } else {
      return service;
    }
  };
  const getServicePath = async (serviceName: string): Promise<string> => {
    if (serviceName == null || serviceName == "") {
      throw new Error("No service name given");
    }
    const filePathCommand = "systemctl show -p FragmentPath " + serviceName;
    const filePathResult = await ipc.invoke("executeSshCommand", remote.id!, filePathCommand);
    if (!filePathResult.success) {
      throw new Error(filePathResult.output);
    } else if (!filePathResult.output) {
      throw new Error("Result is empty");
    }

    filePathResult.output = filePathResult.output.trim();
    filePathResult.output = replaceAll(filePathResult.output, "\r", "");
    filePathResult.output = replaceAll(filePathResult.output, "\n", "");
    filePathResult.output = replaceAll(filePathResult.output, "FragmentPath=", "");
    filePathResult.output = replaceAll(filePathResult.output, "'", "");
    filePathResult.output = replaceAll(filePathResult.output, '"', "");

    if (!filePathResult.output.startsWith("/")) {
      throw new Error("Result is invalid: " + filePathResult.output);
    }
    return filePathResult.output;
  };

  const startService = async (serviceName: string) => {
    await executeOnService(serviceName, "start");
  };
  const stopService = async (serviceName: string) => {
    await executeOnService(serviceName, "stop", "Stop service?");
  };
  const restartService = async (serviceName: string) => {
    await executeOnService(serviceName, "restart", "Restart service?");
  };
  const enableService = async (serviceName: string) => {
    await executeOnService(serviceName, "enable");
  };
  const disableService = async (serviceName: string) => {
    await executeOnService(serviceName, "disable", "Disable service?");
  };

  const executeOnService = async (serviceName: string, systemctlCommand: string, confirmMessage?: string) => {
    if (loading) {
      return false;
    }
    setLoading(true);

    try {
      // check
      if (serviceName == null || serviceName == "") {
        toast.error("Service name not valid");
        return;
      }

      // confirm
      const command = "sudo systemctl " + systemctlCommand + " " + serviceName;
      if (confirmMessage && !(await confirm({ title: confirmMessage, message: command }))) {
        return;
      }

      // execute
      const result = await ipc.invoke('executeSshCommand', remote.id, command);
      let msg = "";
      if (!result.success && result.output) {
        msg += result.output + "\n";
      }
      if (msg == null || msg == "") {
        msg = "Command executed";
      }
      toast.info(msg);
    } catch (err) {
      console.error("failed to execute service command", err, serviceName, systemctlCommand);
      toast.error("Failed to execute service command");
    } finally {
      setLoading(false);
      dispatch(sessionFetchServices(id));
    }
  };

  const deleteService = async (serviceName: string) => {
    if (loading) {
      return false;
    }
    setLoading(true);

    try {
      // check
      if (serviceName == null || serviceName == "") {
        toast.error("Service name not valid");
        return;
      }

      // get file path
      const servicePath = await getServicePath(serviceName);
      if (serviceName == null || serviceName == "") {
        toast.error("Failed to get path of service");
      }

      // confirm
      if (
        !(await confirm({
          title: "Delete Service " + serviceName + "?",
          message: "The service will be stopped, disabled and the service fill will be deleted: " + servicePath,
        }))
      ) {
        return;
      }

      // stop, disable service
      const command =
        "systemctl stop " +
        serviceName +
        " && " +
        "systemctl disable " +
        serviceName +
        " && " +
        "systemctl daemon-reload && " +
        "systemctl reset-failed";
      const result = await ipc.invoke('executeSshCommand', remote.id, command);
      let msg = "";
      if (!result.success != null && result.output) {
        msg += result.output + "\n";
      }
      if (msg == null || msg == "") {
        msg = "Service stopped";
      }
      toast.info(msg);

      // delete service
      try {
        await ipc.invoke('delete', id, servicePath);
        toast.info("Service deleted");
      } catch (err) {
        console.error("failed to delete service file", err, serviceName, servicePath);
        toast.error("Failed to delete service file: " + servicePath);
      }
    } catch (err) {
      console.error("failed to delete service", err, serviceName);
      toast.error("Failed to delete service");
    } finally {
      setLoading(false);
      dispatch(sessionFetchServices(id));
    }
  };

  const editService = async (serviceName: string) => {
    if (loading) {
      return false;
    }
    setLoading(true);
    const service = getServiceByName(serviceName);
    try {
      // open file
      const filePath = await getServicePath(service.name);
      if(filePath) {
        await files.openFile(filePath, 'services');
      }
    } catch (err) {
      console.error("failed to read service file", err, service);
      toast.error("Failed to read service file: " + err);
    } finally {
      setLoading(false);
    }
  };

  const createNewService = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      // ask user for service name
      const serviceName = await input({
        initialValue: "your-name-here.service",
        message: "Enter the name of your new systemd service",
        title: "Create Service",
        yes: "Create",
      });
      if (serviceName == null || serviceName == "") {
        return;
      }
      if (!serviceName.endsWith(".service")) {
        toast.warn("Name must ends with .service");
        return;
      }

      // check service name
      const checkCommand = 'systemctl list-unit-files "' + serviceName + '"';
      const checkCommandResult = await ipc.invoke('executeSshCommand', id, checkCommand);
      if (checkCommandResult.output?.indexOf("\n0 unit files listed.") == -1) {
        toast.warn("Service '" + serviceName + "' already exists. Choose another name");
        return;
      }

      // add session file
      const servicePath = joinPath(["/etc/systemd/system/", serviceName], remote.dto.osType);
      const sessionFile = createFile({
        tab: getFileTabName(id, servicePath),
        filePath: servicePath,
        onCloseNavigateBackTo: "services",
        isNew: true,
        contents:
          "[Unit]\nDescription=\n\n[Service]\nUser=\nWorkingDirectory=\nExecStart=\nRestart=always\nRestartSec=3\n\n[Install]\nWantedBy=multi-user.target",
      });
      dispatch(addSessionFile({ id: id, file: sessionFile, select: true }));
    } catch (err) {
      console.error("failed to create service", err);
      toast.error("Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  const viewServiceLogSinceBoot = async (serviceName: string) => {
    await viewOnService(serviceName, "journalctl -u " + serviceName + " -b");
  };
  const viewServiceLog = async (serviceName: string) => {
    await viewOnService(serviceName, "journalctl -u " + serviceName);
  };
  const viewOnService = async (serviceName: string, command: string) => {
    if (loading) {
      return false;
    }
    setLoading(true);
    const service = getServiceByName(serviceName);
    try {
      const result = await ipc.invoke('executeSshCommand', remote.id!, command);
      if (!result.success && result.output && result.output != '') {
        toast.error(result.output);
      } else if (!result.output || result.output == '') {
        toast.warn("No result");
      } else {
        await info({ title: service.name, message: result.output });
      }
    } catch (err) {
      console.error("failed to execute command to get service output", err, command);
      toast.error("Failed to view service output");
    } finally {
      setLoading(false);
    }
  };

  const daemonReload = async () => {
    try {
      const result = await ipc.invoke('executeSshCommand', id, "sudo systemctl daemon-reload");
      if (!result.success != null) {
        toast.error(result.output);
      } else {
        toast.success("Service Daemon reloaded");
      }
    } catch (err) {
      console.error("failed to reload service daemon", err);
      toast.error("Failed to reload service daemon");
    }
  };

  const goToServiceFolder = async () => {
    try {
      await dispatch(sessionList({ id: id, path: "/etc/systemd/system", clearFilter: true }));
      dispatch(setSelectedTab({ id: id, key: "files" }));
    } catch (err) {
      console.error("failed to go to service folder", err);
      toast.error("Failed to go to services folder");
    }
  };

  return {
    loading,
    setLoading,
    startService,
    stopService,
    restartService,
    enableService,
    disableService,
    deleteService,
    executeOnService,

    viewServiceLogSinceBoot,
    viewServiceLog,
    viewOnService,

    editService,
    getServiceByName,
    createNewService,

    daemonReload,
    goToServiceFolder,
  };
};
