import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { createContext, useContext, ReactNode, useState, useRef } from "react";

interface InfoOptions {
  title?: string;
  message?: string;
  ok?: string;
}

interface PromiseRef {
  resolve: () => void;
  reject: () => void;
}

// Create Context
const InfoContext = createContext<(options: InfoOptions) => Promise<void>>(undefined);

export const useInfo = () => useContext(InfoContext);
export const InfoServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<InfoOptions | null>(null);
  const awaitingPromiseRef = useRef<PromiseRef | null>(null);

  const openModal = (options: InfoOptions) => {
    setOptions(options);
    return new Promise<void>((resolve, reject) => {
      awaitingPromiseRef.current = { resolve, reject };
    });
  };

  const close = () => {
    if (awaitingPromiseRef.current) {
      awaitingPromiseRef.current.resolve();
    }
    setOptions(null);
  };

  return (
    <>
      <InfoContext.Provider value={openModal} children={children} />

      <Modal isOpen={options != null} backdrop="blur" onClose={() => close()} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">{options && options.title ? options.title : ""}</ModalHeader>
            <ModalBody>
              <code className="font-mono pl-4 whitespace-pre-wrap">{options?.message}</code>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={() => close()}>
                {options?.ok ?? "Okay"}
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};
