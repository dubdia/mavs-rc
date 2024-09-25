import { DependencyList, useEffect } from "react";

/** async wrapper for @see useEffect */
export const useAsyncEffect = (func: () => Promise<any>, deps?: DependencyList | undefined) => {
    useEffect(() => {
        func();
    }, deps);
}