import { SerializedError, ActionReducerMapBuilder, createAsyncThunk, AsyncThunk, AsyncThunkPayloadCreator, AsyncThunkAction, Dispatch } from "@reduxjs/toolkit";
import { Draft } from "immer";

export interface ThunkAndHandler<S, Returned, ThunkArg = void> {
    (arg: ThunkArg | void | undefined): AsyncThunkAction<Returned, ThunkArg, any>,
    thunk: AsyncThunk<Returned, ThunkArg, any>,
    register: (builder: ActionReducerMapBuilder<S>) => void
}
export type AsyncThunkConfig = {
    state?: unknown;
    dispatch?: Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
};

export const createAsync = <S, Returned, ThunkArg = null>(
    name: string,
    func: (arg: ThunkArg) => Promise<Returned>,
    //payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, AsyncThunkConfig>,
    { onPending, onFulfilled, onRejected, onFinished }: {
        onPending?: (state: Draft<S>, args?: ThunkArg) => void | null | undefined,
        onFulfilled?: (state: Draft<S>, data: Returned, args?: ThunkArg) => void | null | undefined,
        onRejected?: (state: Draft<S>, error: SerializedError, args?: ThunkArg) => void | null | undefined,
        onFinished?: (state: Draft<S>, data?: Returned, error?: SerializedError, args?: ThunkArg) => void | null | undefined,
    })
    : ThunkAndHandler<S, Returned, ThunkArg> => {
    // create thunk
   /* const wrapperFunc: AsyncThunkPayloadCreator<Returned, ThunkArg, AsyncThunkConfig> = (arg, { rejectWithValue, fulfillWithValue } ) => {
        return func(arg).then(data => {
            console.log('THEN', name);
            return fulfillWithValue(data);
        }).catch((err) => {
            console.log('ERROR', name, err);
            return rejectWithValue('ERROR');
        });
    }*/
    const wrapperFunc: AsyncThunkPayloadCreator<Returned, ThunkArg, {}> = async (arg, { rejectWithValue  } ) => {
       try {
            return await func(arg);
        } catch(err) {
            const serializableError = JSON.parse(JSON.stringify(err));
            return rejectWithValue(serializableError);
        }
    }


    const thunk = createAsyncThunk(name, wrapperFunc);


    // create function to register cases in builder
    const handler = (builder: ActionReducerMapBuilder<S>) => {
        builder
            .addCase(thunk.pending, (state, action) => {
                //console.log('PENDING', name, action);
                if (onPending != null) {
                    onPending(state, action.meta.arg);
                }
            })
            .addCase(thunk.fulfilled, (state, action) => {
                //console.log('FULFILLED', name, action);
                if (onFulfilled != null) {
                    onFulfilled(state, action.payload, action.meta.arg);
                }
                if (onFinished != null && (action.meta as any).finished !== true) {
                    onFinished(state, action.payload, undefined, action.meta.arg)
                }
                (action.meta as any).finished = true;
            })
            .addCase(thunk.rejected, (state, action) => {
                const error = action.payload ?? action.error;
                //console.log('REJECTED', name, error);
                if (onRejected != null) {

                    onRejected(state, error, action.meta.arg);
                }
                if (onFinished != null && (action.meta as any).finished !== true) {
                    onFinished(state, action.payload as any, error, action.meta.arg)
                }
                (action.meta as any).finished = true;
            })
    };

    // return both
    const thunkAndHandler: ThunkAndHandler<S, Returned, ThunkArg> = Object.assign(
        (arg: ThunkArg | void | undefined) => {
            return thunk(arg! as any)
        },
        {
            thunk: thunk,
            register: handler
        }
    );
    return thunkAndHandler;
}

export const createThunkHandler = <S, T>(
    thunk: AsyncThunk<T, any, any>,
    { onPending, onFulfilled, onRejected }: {
        onPending?: (state: Draft<S>) => void | null | undefined,
        onFulfilled?: (state: Draft<S>, data: T) => void | null | undefined,
        onRejected?: (state: Draft<S>, error: SerializedError) => void | null | undefined
    })
    : (builder: ActionReducerMapBuilder<S>) => void => {

    // create function to register cases in builder
    const handler = (builder: ActionReducerMapBuilder<S>) => {
        builder
            .addCase(thunk.pending, (state) => {
                if (onPending != null) {
                    onPending(state);
                }
            })
            .addCase(thunk.fulfilled, (state, action) => {
                if (onFulfilled != null) {
                    onFulfilled(state, action.payload);
                }
            })
            .addCase(thunk.rejected, (state, action) => {
                if (onRejected != null) {
                    onRejected(state, action.error as any);
                }
            });
    };

    // return the handler function
    return handler;
}