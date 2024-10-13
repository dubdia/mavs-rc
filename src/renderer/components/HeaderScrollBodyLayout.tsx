import { Card, CardBody } from "@nextui-org/react";
import body from "../Body";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface HeaderScrollBodyLayoutProps {
  header: React.ReactNode; // Type for header component
  headerInCard?: boolean;
  body: React.ReactNode; // Type for body component
  bodyScrollable?: boolean;
}

export const HeaderScrollBodyLayout: React.FC<HeaderScrollBodyLayoutProps> = ({
  header,
  body,
  bodyScrollable = true,
  headerInCard = true,
}) => {
  // wrap body in scrollbars?
  if (bodyScrollable) {
    body = (
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { theme: "os-theme-light", autoHide: "leave" } }}
        className="flex-grow pb-4"
      >
        {body}
      </OverlayScrollbarsComponent>
    );
  }

    // wrap header in card?
    if (headerInCard) {
      header = (
        <Card className="shrink-0">
        <CardBody>{header}</CardBody>
      </Card>
      );
    }



  return (
    <div className="w-full h-full max-h-full flex flex-col gap-4">
      {header}
      {body}
    </div>
  );
};
