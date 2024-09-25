import { RemoteTunnelInfo } from "../../../shared/models/RemoteTunnelInfo";
import { useInput } from "../../components/dialogs/InputDialog";
import { sessionConnectTunnel, sessionCreateTunnel, sessionDestroyTunnel, sessionRemoteTunnel, sessionUpdateTunnel } from "../../store/remotesSlice";
import { useAppDispatch } from "../../store/store";


export const useTunnels = (id: string) => {
    const input = useInput();
    const dispatch = useAppDispatch();

    const connectTunnel = async (tunnelId: string) => {
        await dispatch(sessionConnectTunnel({ id: id, tunnelId: tunnelId }));
    }
    const destroyTunnel = async (tunnelId: string) => {
        await dispatch(sessionDestroyTunnel({ id: id, tunnelId: tunnelId }));
    }

    const addTunnel = async () => {
        const name = await input({
            title: "Add new tunnel",
            message: "Enter name of the tunnel",
            yes: "Create",
        });
        if (name == null || name == '') {
            return;
        }
        await dispatch(sessionCreateTunnel({ id: id, tunnelName: name }));
    }
    const removeTunnel = async (tunnelId: string) => {
        await dispatch(sessionRemoteTunnel({ id: id, tunnelId: tunnelId }));
    }

    const updateTunnel = async (tunnel: RemoteTunnelInfo) => {
        await dispatch(sessionUpdateTunnel({ id: id, tunnel: tunnel }));
    }


    return {
        connectTunnel,
        destroyTunnel,

        addTunnel,
        removeTunnel,
        updateTunnel
    }
}