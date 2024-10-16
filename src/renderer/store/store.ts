import { configureStore } from "@reduxjs/toolkit";
import { appSlice } from "./remotesSlice";
import { useDispatch, useSelector } from "react-redux";
import { Remote } from "../models/Remote";

/** contains the state of the react app (redux store) */
export const store = configureStore({
    reducer: {
        data: appSlice.reducer
    },
    middleware: (getDetaultMiddleware) => getDetaultMiddleware({
        serializableCheck: {
            ignoreActions: true
        }
    }),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<AppState>()

export const useRemote = (id: string) => {
    return useAppSelector((state) => state.data.data.entities[id]);
}
export const useRemoteSelector = <T>(id: string | undefined | null, selector: (remote: Remote) => T) => {
    return useAppSelector((state) => {
        const remote = state.data.data.entities[id]
        return selector(remote);
    });
}
