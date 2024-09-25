import { ErrorFallback } from "../components/fallbacks/error-fallback";
import { SuspenseFallback } from "../components/fallbacks/suspense-fallback";
import { ErrorBoundary } from "react-error-boundary";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { ConfirmServiceProvider } from "../components/dialogs/ConfirmDialog";
import { InputServiceProvider } from "../components/dialogs/InputDialog";
import { store } from "../store/store";
import { Suspense } from "react";
import { InfoServiceProvider } from "../components/dialogs/InfoDialog";
import { UploadServiceProvider } from "../components/dialogs/UploadDialog";

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <Suspense fallback={SuspenseFallback()}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <>
          <Provider store={store}>
            <ConfirmServiceProvider>
              <InputServiceProvider>
                <InfoServiceProvider>
                  <UploadServiceProvider>{children}</UploadServiceProvider>
                </InfoServiceProvider>
              </InputServiceProvider>
            </ConfirmServiceProvider>
          </Provider>
          <ToastContainer theme="dark" closeOnClick={true} closeButton={false} />
        </>
      </ErrorBoundary>
    </Suspense>
  );
};
