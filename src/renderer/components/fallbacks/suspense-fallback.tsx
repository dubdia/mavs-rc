import { Spinner } from "@nextui-org/react";
import { Center } from "../Center";

export const SuspenseFallback = () => {
  return (
    <Center><Spinner size="lg" /></Center> 
  );
};
