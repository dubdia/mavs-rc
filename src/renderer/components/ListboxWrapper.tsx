import { PropsWithChildren } from "react";
export const ListboxWrapper = (props: PropsWithChildren) => (
  <div className="w-full max-w-[260px] border-small px-1 py-2 rounded-small border-default-200 dark:border-default-100">
    {props.children}
  </div>
);
