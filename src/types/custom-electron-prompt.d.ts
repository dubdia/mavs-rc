// custom-electron-prompt.d.ts
declare module "custom-electron-prompt" {
    export interface PromptOptions {
        width?: number;
        height?: number;
        resizable?: boolean;
        title?: string;
        label?: string;
        buttonLabels?: { ok: string; cancel: string; };
        value?: string;
        type?: 'input' | 'select' | 'counter' | 'multiInput' | 'keybind';
        selectOptions?: { [key: string]: string } | string[];
        keybindOptions?: unknown;
        counterOptions?: {
            minimum?: number;
            maximum?: number;
            multiFire?: boolean;
        };
        icon?: string;
        useHtmlLabel?: boolean;
        customStylesheet?: string | boolean;
        menuBarVisible?: boolean;
        skipTaskbar?: boolean;
        frame?: boolean;
        customScript?: string;
        enableRemoteModule?: boolean;
    }

    // This declares that the default export of the module is this function
    export default function prompt(options: PromptOptions, parentWindow?: Electron.BrowserWindow): Promise<unknown>;
}