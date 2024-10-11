import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { createContext, useContext, ReactNode, useState, useRef } from "react";

interface InputOptions {
  title?: string;
  message?: string;
  yes?: string;
  no?: string;
  initialValue?: string;
}

interface PromiseRef {
  resolve: (value: string | null) => void;
  reject: () => void;
}

// Create Context
const InputContext = createContext<(options: InputOptions) => Promise<string | null>>(undefined as any);

export const useInput = () => useContext(InputContext);
export const InputServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<InputOptions | null>(null);
  const [value, setValue] = useState("");
  const awaitingPromiseRef = useRef<PromiseRef | null>(null);

  const openModal = (options: InputOptions) => {
    setOptions(options);
    setValue(options.initialValue ?? "");

    return new Promise<string | null>((resolve, reject) => {
      awaitingPromiseRef.current = { resolve, reject };
    });
  };

  const handle = (value: string | null) => {
    if (awaitingPromiseRef.current) {
      awaitingPromiseRef.current.resolve(value ?? null);
    }
    setOptions(null);
  };

  const handleKeyDown = (e: any) => {
    if (e?.key === "Enter") {
      handle(value);
    }
  };
  return (
    <>
      <InputContext.Provider value={openModal} children={children} />

      <Modal isOpen={options != null} backdrop="blur" onClose={() => handle(null)}>
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">{options && options.title ? options.title : ""}</ModalHeader>
            <ModalBody>
              {options?.message}
              <Input
                autoFocus={true}
                value={value}
                onChange={(c) => setValue(c.target.value)}
                onKeyDown={handleKeyDown}
              ></Input>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={() => handle(null)} autoFocus>
                {options?.no ?? "Cancel"}
              </Button>
              <Button color="primary" onPress={() => handle(value)}>
                {options?.yes ?? "Okay"}
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};
