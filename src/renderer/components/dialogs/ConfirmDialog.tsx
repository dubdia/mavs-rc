import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { createContext, useContext, ReactNode, useState, useRef } from "react";

interface ConfirmOptions {
  title?: string;
  message?: string;
  yes?: string;
  no?: string;
}

interface PromiseRef {
  resolve: (confirmed: boolean) => void;
  reject: () => void;
}

// Create Context
const ConfirmContext = createContext<
  (options: ConfirmOptions) => Promise<boolean>
>(undefined as any);

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmServiceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const awaitingPromiseRef = useRef<PromiseRef | null>(null);

  const openModal = (options: ConfirmOptions) => {
    setOptions(options);
    return new Promise<boolean>((resolve, reject) => {
      awaitingPromiseRef.current = { resolve, reject };
    });
  };

  const handle = (confirmed: boolean) => {
    if (awaitingPromiseRef.current) {
      awaitingPromiseRef.current.resolve(confirmed);
    }
    setOptions(null);
  };

  return (
    <>
      <ConfirmContext.Provider value={openModal} children={children} />

      <Modal
        isOpen={options != null}
        backdrop="blur"
        onClose={() => handle(false)}
      >
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1">
              {options && options.title ? options.title : ""}
            </ModalHeader>
            <ModalBody>{options?.message}</ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={() => handle(false)}
                autoFocus
              >
                {options?.no ?? "Cancel"}
              </Button>
              <Button color="primary" onPress={() => handle(true)}>
                {options?.yes ?? "Okay"}
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};
