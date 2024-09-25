import { Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { filesize } from "filesize";
import { createContext, useContext, ReactNode, useState, useRef, ChangeEvent } from "react";
import { FaUpload } from "react-icons/fa";

interface UploadOptions {
  title?: string;
  message?: string;
  yes?: string;
  no?: string;
}

interface PromiseRef {
  resolve: (file: File | null) => void;
  reject: () => void;
}

// Create Context
const UploadContext = createContext<(options: UploadOptions) => Promise<File | null>>(undefined as any);

export const useUpload = () => useContext(UploadContext);
export const UploadServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<UploadOptions | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const awaitingPromiseRef = useRef<PromiseRef | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const openModal = (options: UploadOptions) => {
    setOptions(options);
    return new Promise<File | null>((resolve, reject) => {
      awaitingPromiseRef.current = { resolve, reject };
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event?.target?.files;
    if (files == null || files.length !== 1) {
      setFile(null);
      return;
    }
    const file = files[0];
    if (file == null || file.name == null || file.name == "" || file.size <= 0) {
      setFile(null);
      return;
    }

    event.target.value = "";
    event.target.type = "";
    event.target.type = "file";
    setFile(file);
  };

  const handle = () => {
    awaitingPromiseRef.current?.resolve(file);
    setOptions(null);
    setFile(null);
  };
  const close = () => {
    awaitingPromiseRef.current?.resolve(null);
    setOptions(null);
    setFile(null);
  };

  return (
    <>
      <UploadContext.Provider value={openModal} children={children} />

      <Modal isOpen={options != null} backdrop="blur" onClose={() => close()}>
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">{options && options.title ? options.title : ""}</ModalHeader>
            <ModalBody>
              {options?.message}
              <input type="file" ref={fileInput} style={{ display: "none" }} onChange={handleFileChange} />
              {file == null && (
                <Button onClick={() => fileInput.current?.click()}>
                  <FaUpload></FaUpload>
                </Button>
              )}
              {file != null && <Button onClick={() => fileInput.current?.click()}>{file.name}</Button>}
            </ModalBody>
            <ModalFooter className="items-center">
              {file && <Chip>{filesize(file?.size ?? 0)}</Chip>}
              <Button color="danger" variant="light" onPress={() => close()} autoFocus>
                {options?.no ?? "Cancel"}
              </Button>
              <Button color="primary" onPress={() => handle()} isDisabled={file == null}>
                {options?.yes ?? "Upload "}
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};
