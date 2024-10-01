import { Card, CardBody, CardHeader, Spinner } from "@nextui-org/react";
import { useState } from "react";
import { useAsyncEffect } from "../../utils/useAsyncEffect";
import { toast } from "react-toastify";
import { SystemInfo } from "../../../shared/models/SystemInfo";
import { ipc } from "../../app";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

export const Info = ({ id }: { id: string }) => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  console.log("RENDER Info", id);

  useAsyncEffect(async () => {
    setLoading(true);
    try {
      const info = await ipc.invoke("getInfo", id);
      if (info == null) {
        throw new Error("Api returned no info");
      }
      setInfo(info);
    } catch (err) {
      console.error("failed to get computer info", id, err);
      toast.error("Failed to get info");
    } finally {
      setLoading(false);
    }
  }, []);

  const get = (content: string | null | undefined) => {
    return <code className="whitespace-pre-wrap">{content ?? ""}</code>;
  };

  return (
    <OverlayScrollbarsComponent
      defer
      options={{ scrollbars: { theme: "os-theme-light", autoHide: "leave" } }}
      className="h-full"
    >
      <div className="w-full">
        {/* Remote Connection Info */}
        <Card className="mb-4">
          {loading == true && (
            <CardBody>
              <Spinner></Spinner>
            </CardBody>
          )}
          {loading == false && info != null && (
            <>
              <CardHeader>
                <p className="text-xl">{get(info?.name)}</p>
              </CardHeader>
              <CardBody>
                <h1>
                  <b>Memory</b>
                </h1>
                {get("Total: " + info?.ramTotal)}
                {get("Free : " + info?.ramFree)}
                {get("Used : " + info?.ramUsed)}
                <br></br>

                <h1>
                  <b>Disk</b>
                </h1>
                {get(info?.disk)}
              </CardBody>
            </>
          )}
          {loading == false && info == null && (
            <CardBody>
              <p>An error occured</p>
            </CardBody>
          )}
        </Card>
      </div>
    </OverlayScrollbarsComponent>
  );
};
