import { Tooltip as NextUiTooltip } from "@nextui-org/react";
import { PropsWithChildren } from "react";

type MyTooltipProps = PropsWithChildren & {
  content: React.ReactNode;
};
export const Tooltip = (props: MyTooltipProps) => {
  return (
    <NextUiTooltip color="foreground" offset={25} delay={150} content={props.content}>
      {props.children}
    </NextUiTooltip>
  );
};
