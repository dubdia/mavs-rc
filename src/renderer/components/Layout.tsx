import { Divider } from "@nextui-org/react";
import React from "react";

interface LayoutProps {
  name: React.ReactNode;
  header: React.ReactNode; // Type for header component
  body: React.ReactNode; // Type for body component
}

export const Layout: React.FC<LayoutProps> = ({ name, header, body }) => {
  return (
    <div className="absolute top-0 left-0 bottom-0 flex flex-col w-full max-w-5xl ">
      <div className="absolute top-0 left-0 right-0 flex flex-col justify-end backdrop-blur-lg backdrop-saturate-150 z-40 h-[70px] pr-8 ">
        <div className="flex flex-row justify-between items-center h-full mt-4 ">
          <h1 className="text-2xl leading-none select-none">{name}</h1> {/*pl-[255px]*/}
          {header}
        </div>
        <Divider></Divider>
      </div>
      <div className="absolute top-[70px] left-0 right-0 bottom-0 pr-8 pt-4 space-y-4">{body}</div>
    </div>
  );
};
