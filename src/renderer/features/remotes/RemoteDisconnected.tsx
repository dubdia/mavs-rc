import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  Select,
  SelectItem,
  Textarea,
  Selection,
  Autocomplete,
  AutocompleteItem,
  Tooltip,
} from "@nextui-org/react";
import { memo, useEffect, useState } from "react";
import { useAppDispatch, useRemoteSelector } from "../../store/store";
import { connectRemote, removeRemote, updateRemote } from "../../store/remotesSlice";
import { useConfirm } from "../../components/dialogs/ConfirmDialog";
import { toast } from "react-toastify";
import { FaFile, FaKey } from "react-icons/fa";
import { Layout } from "../../components/Layout";
import { ipc } from "../../app";
import { RemoteInfo } from "../../../shared/models/RemoteInfo";

export const RemoteDisconnected = memo(({ id }: { id: string }) => {
  console.log("RENDER RemoteDisconnected", id);

  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const info = useRemoteSelector(id, (remote) => remote.dto.info);
  const loading = useRemoteSelector(id, (remote) => remote.session.loading);
  const [form, setForm] = useState(info!);
  const [certNames, setCertNames] = useState<string[] | null>(null);

  useEffect(() => {
    ipc
      .invoke("getSshCertNames")
      .then((names) => {
        setCertNames(names);
      })
      .catch((e) => {
        toast.error("Failed to load Cert names: " + e);
      });
  }, [ipc]);

  const handleChange = (event: any) => {
    // get name
    const target = event.target as HTMLInputElement;
    const name = (target as any).name;
    if (name == null || name == "") {
      throw new Error("Please provide a name on the input");
    }

    // get value
    let value = target.value;
    if (target.type == "checkbox") {
      value = event.target.checked ?? false;
    }

    // clone json
    const json = JSON.parse(JSON.stringify(form));
    json[name] = value;
    // update
    setForm(json);
  };

  const handleRemove = async () => {
    if (
      !(await confirm({ title: "Delete " + (info?.name ?? "Remote"), message: "Sure you want to remove this remote?" }))
    ) {
      return;
    }
    await dispatch(removeRemote(id));
  };

  const handleUpdate = async () => {
    await dispatch(updateRemote(form));
  };
  const handleUpdateAndConnect = async () => {
    await dispatch(updateRemote(form));
    await dispatch(connectRemote(id));
  };

  const getSelectedPrivateKey = (): string => {
    if (form.privateKeySource == "text") {
      return "text";
    } else if (form.privateKeySource == "file") {
      if (form.privateKeyFileName != null && form.privateKeyFileName != "") {
        return "file" + form.privateKeyFileName;
      }
    }
    return "";
  };
  const selectPrivateKey = (selection: string) => {
    const newForm = JSON.parse(JSON.stringify(form)) as RemoteInfo;

    if (selection == null || selection == "") {
      newForm.privateKeySource = undefined;
      newForm.privateKeyFileName = "";
      newForm.privateKey = "";
    } else {
      if (selection == "text") {
        newForm.privateKeySource = "text";
        newForm.privateKeyFileName = "";
      } else if (selection.startsWith("file")) {
        const fileName = selection.substring("file".length);
        newForm.privateKeySource = "file";
        newForm.privateKeyFileName = fileName;
      }
      console.log("selected", selection);
    }

    setForm(newForm);
  };

  return (
    <Layout
      name={form.name ?? ""}
      header={<></>}
      body={
        <>
          {/* Remote Connection Info */}
          <Card className="mb-4">
            <CardBody>
              <div className="grid grid-cols-12 gap-4">
                <Input
                  name="name"
                  className="col-span-12 md:col-span-12 lg:col-span-4 font-bold"
                  type="text"
                  label="Name"
                  autoComplete="off"
                  placeholder="Enter the title of the remote"
                  value={form.name}
                  onChange={handleChange}
                />
                <Input
                  name="description"
                  className="col-span-12 md:col-span-12 lg:col-span-8"
                  type="text"
                  label="Description"
                  autoComplete="off"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                />
                <Input
                  name="user"
                  className="col-span-12 md:col-span-4 lg:col-span-4"
                  type="text"
                  label="Username"
                  autoComplete="off"
                  placeholder="Enter the SSH Username"
                  value={form.user}
                  onChange={handleChange}
                />
                <Input
                  name="host"
                  className="col-span-8 md:col-span-5 lg:col-span-6"
                  type="text"
                  label="Host"
                  autoComplete="off"
                  placeholder="Enter the Host or IP"
                  value={form.host}
                  onChange={handleChange}
                />
                <Input
                  name="port"
                  className="col-span-4 md:col-span-3 lg:col-span-2"
                  type="number"
                  label="Port"
                  autoComplete="off"
                  defaultValue="22"
                  placeholder="Enter the SSH Port"
                  value={form.port?.toString() ?? "22"}
                  onChange={handleChange}
                />
              </div>
            </CardBody>
          </Card>

          {/* Password Authentication */}
          <Card className="mb-4">
            <CardHeader>
              <Checkbox name="usePasswordAuth" isSelected={form.usePasswordAuth === true} onChange={handleChange}>
                Password authentication
              </Checkbox>
            </CardHeader>
            {form.usePasswordAuth && (
              <CardBody>
                <div className="grid grid-cols-12 gap-4">
                  <Input
                    name="password"
                    className="col-span-12 md:col-span-8"
                    type="password"
                    label="SSH Password"
                    autoComplete="new-password"
                    placeholder="Enter the password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <Tooltip
                    color="foreground"
                    offset={25}
                    content="Caution: if true, the password will be stored plaintext in the configuration file"
                  >
                    <Checkbox
                      name="storePassword"
                      className="col-span-12 md:col-span-4"
                      isSelected={form.storePassword === true}
                      onChange={handleChange}
                    >
                      Store password
                    </Checkbox>
                  </Tooltip>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Private-Key Authentication */}
          <Card className="mb-4">
            <CardHeader>
              <Checkbox name="usePrivateKeyAuth" isSelected={form.usePrivateKeyAuth === true} onChange={handleChange}>
                Private-Key authentication
              </Checkbox>
            </CardHeader>

            {form.usePrivateKeyAuth === true && (
              <CardBody>
                <div className="grid grid-cols-12 gap-4">
                  {/* Private Key Source */}
                  <Autocomplete
                    label="Select your Private Key"
                    className="col-span-8"
                    selectedKey={getSelectedPrivateKey()}
                    onSelectionChange={selectPrivateKey}
                  >
                    {[
                      <AutocompleteItem key={"text"} value="" startContent={<FaKey />}>
                        Paste own Key
                      </AutocompleteItem>,
                      ...(certNames?.map((x) => (
                        <AutocompleteItem key={"file" + x} value={x} startContent={<FaFile />}>
                          {x}
                        </AutocompleteItem>
                      )) ?? []),
                    ]}
                  </Autocomplete>

                  {/* Own Private Key */}
                  {form.privateKeySource == "text" && (
                    <Textarea
                      name="privateKey"
                      className="col-span-12 md:col-span-8"
                      type="password"
                      label="Open-SSH Private Key"
                      autoComplete="new-password"
                      placeholder="Enter the Contents of the Private-Key"
                      value={form.privateKey}
                      onChange={handleChange}
                    />
                  )}
                  {form.privateKeySource == "text" && (
                    <Tooltip
                      color="foreground"
                      offset={25}
                      content="Caution: if true, the private-key will be stored plaintext in the configuration file"
                    >
                      <Checkbox
                        name="storePrivateKey"
                        className="col-span-12 md:col-span-4"
                        isSelected={form.storePrivateKey == true}
                        onChange={handleChange}
                      >
                        Store Private-Key
                      </Checkbox>
                    </Tooltip>
                  )}

                  <Input
                    name="passphrase"
                    className="col-span-12 md:col-span-8"
                    type="password"
                    label="SSH Private-Key Passphrase"
                    autoComplete="new-password"
                    placeholder="Enter the Passphrase of the Private-Key"
                    value={form.passphrase}
                    onChange={handleChange}
                  />
                  <Tooltip
                    color="foreground"
                    offset={25}
                    content="Caution: if true, the passphrase will be stored plaintext in the configuration file"
                  >
                    <Checkbox
                      name="storePassphrase"
                      className="col-span-12 md:col-span-4"
                      isSelected={form.storePassphrase === true}
                      onChange={handleChange}
                    >
                      Store Passphrase
                    </Checkbox>
                  </Tooltip>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-end">
            <Button color="danger" onClick={handleRemove} isDisabled={loading}>
              Delete
            </Button>
            <Button color="primary" onClick={handleUpdate} isDisabled={loading}>
              Save
            </Button>
            <Button color="success" onClick={handleUpdateAndConnect} isLoading={loading}>
              Save & Connect
            </Button>
          </div>
        </>
      }
    />
  );
});
