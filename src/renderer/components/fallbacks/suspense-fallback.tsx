import { Spinner } from "@nextui-org/react";

export const SuspenseFallback = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
};
