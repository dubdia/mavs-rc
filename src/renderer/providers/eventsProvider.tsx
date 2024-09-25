// import { useAppDispatch, useAppSelector } from "../store/store";
// import { createContext, useContext, useEffect, useState } from "react";
// import { appendShellData } from "../store/remotesSlice";

// export type SignalRContextType = {
//   hub: HubConnection | null;
// };
// const initialState: SignalRContextType = { hub: null };
// export const SignalRContext = createContext<SignalRContextType>(initialState);
// export const useSignalR = () => useContext(SignalRContext);

// export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   // get auth and define state
//  /* const dispatch = useAppDispatch();
//   const auth = useAppSelector((state) => state.data.auth);
//   const [state, setState] = useState<{ hub: HubConnection | null }>({ hub: null });
// */
//   // called on state changes
//   /*const handleStateChange = () => {
//     setState({ hub: state.hub });
//   };
// */
//   // use effect to initialize or dispose the connection
//  /* useEffect(() => {
//     const init = async () => {
//       try {
//         // check auth state
//         if (auth.loggedIn && state.hub == null) {
//           console.log("RENDER SignalRProvider connect");
//           // build connection
//           const connection = new HubConnectionBuilder()
//             .withUrl('jo', {
//               withCredentials: true,
//               accessTokenFactory: () => auth.tokenSecret ?? "",
//               headers: {
//                 "x-auth-key": auth.tokenSecret ?? "",
//               },
//               transport: HttpTransportType.WebSockets,
//             })
//             .withAutomaticReconnect()
//             .build();

//           // subscribe to change events
//           connection.onclose(() => handleStateChange());
//           connection.onreconnected(() => handleStateChange());
//           connection.onreconnecting(() => handleStateChange());
//           await connection.start();

//           // subscribe to incoming data
//           connection.on("shell-received", (sessionId: string, data: string) => {
//             //console.log("shell-received", sessionId, data);
//             if (data == null || data.length == 0) {
//               return;
//             }
//             dispatch(appendShellData({ id: sessionId, data: data }));
//           });

//           // update state
//           setState({ hub: connection });
//         } else if (!auth.loggedIn && state.hub != null) {
//           console.log("RENDER SignalRProvider disconnect");
//           // dispose connection
//           await state.hub.stop();
//           setState({ hub: null });
//         }
//       } catch (err) {
//         console.error("could not initialize signalr", err, state);
//         handleStateChange();
//       }
//     };
//     init();
//   }, [auth]);*/

//   return (
//     {children}
//  /*   <div>
//       <SignalRContext.Provider value={{ hub: state.hub }}>{children}</SignalRContext.Provider>
//     </div>*/
//   );
// };
