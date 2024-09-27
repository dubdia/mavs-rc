import { Spinner } from "@nextui-org/react";

export const SuspenseFallback = () => {
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0">
      <div className="flex w-full h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    </div>
  );
};
