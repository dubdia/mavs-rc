import { Divider } from "@nextui-org/react";
import React from "react";

interface LayoutProps {
  name: string;
  header: React.ReactNode; // Type for header component
  body: React.ReactNode; // Type for body component
}

export const Layout: React.FC<LayoutProps> = ({ name, header, body }) => {
  return (
    <div className="absolute top-0 left-0 bottom-0 flex flex-col w-full max-w-5xl">
      <div className="sticky top-0 left-0 right-0 flex flex-col justify-end backdrop-blur-lg backdrop-saturate-150 z-40 h-24 min-h-24 max-h-24 pr-8">
        <div className="flex flex-row justify-between items-center mb-2">
          <h1 className=" text-4xl leading-none select-none">{name}</h1>
          {header}
        </div>
        <Divider></Divider>
      </div>

      <div className="relative flex-grow pr-8 py-4 space-y-4">{body}</div>
    </div>
  );
};
