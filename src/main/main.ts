import { app, BrowserWindow, globalShortcut, session } from "electron";
import { StatefullBrowserWindow } from "stateful-electron-window";
import { SshManager } from "./ssh-manager";
import log from "electron-log/main";
import { RemotesManager } from "./remotes-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { AppConfigManager } from "./config/app-config-manager";
import { SshCertManager } from "./ssh-cert-manager";
import { ScriptManager } from "./script-manager";
import { currentPath } from "../shared/utils/path-utils";

// handle uncaught exceptions
process.on("uncaughtException", function (error) {
  try {
    log.error("Uncaught exception", error);
  } catch (err) {
    console.error("failed to log uncaught exception becuase of this error", err);
    console.error("Here the uncaught exception: ", error);
  }
});

// loading configuration and configure logger
export const appConfigManager = new AppConfigManager();
log.transports.console.level = appConfigManager.config.logLevel; // MAIN_WINDOW_VITE_DEV_SERVER_URL != null ? "debug" : appConfigManager.config.logLevel
//const userDataPath = app.getPath("userData");
//log.transports.file.resolvePathFn = () => path.join(userDataPath, "rc.log");
log.transports.file.level = appConfigManager.config.logLevel;

// print startup message
const appVersion = app.getVersion();
const devTools = MAIN_WINDOW_VITE_DEV_SERVER_URL != null || appConfigManager.config.devTools; // only enable when debugging or when configured
log.info(
  `Starting app v${appVersion} with log level ${appConfigManager.config.logLevel}${devTools ? " and Dev-Tools" : ""}`
);

// create managers
log.verbose(`Create managers...`);
export const remotesManager = new RemotesManager();
export const sshCertManager = new SshCertManager();
export const sshManager = new SshManager(remotesManager, sshCertManager);
export const scriptManager = new ScriptManager(remotesManager, sshManager, appConfigManager);
export let mainWindow!: BrowserWindow; // will be assigned later

// configure close/dispose
{
  // handle creating/removing shortcuts on windows when installing/uninstalling.
  if (require("electron-squirrel-startup")) {
    log.info("Quit because of squirrel");
    app.quit();
  }

  // quit when all windows are closed
  app.on("window-all-closed", () => {
    log.info("Quit because all windows are closed");
    app.quit();
  });

  // dispose on close
  let appIsShuttingDown = false;
  app.on("before-quit", async (e) => {
    if (!appIsShuttingDown) {
      // prevent shutdown now
      e.preventDefault();

      // cleanup
      log.info("Quit application...");
      await remotesManager?.disposeAsync();

      // quit again
      appIsShuttingDown = true;
      app.quit();
    }
  });
  app.on("quit", (e, exitCode) => {
    log.info(
      `Application quit with exit code ${exitCode}. Services were ${
        appIsShuttingDown ? "disposed correctly" : "not disposed"
      }`
    );
  });
}

// create window when ready
app.on("ready", () => {
  // configure security restrictions
  {
    // define what requests are allowed
    const allowedUrls: string[] = [];

    // allow calls to the current directory:
    allowedUrls.push("file:///" + app.getAppPath().replaceAll("\\", "/"));

    // in development, allow our vite dev-server and the dev-tools as source
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      allowedUrls.push(MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_DEV_SERVER_URL.replace("http://", "ws://"));
    }

    // allow devtools if enabled
    if (devTools) {
      allowedUrls.push("devtools://");
    }

    // block outgoing requests for more security
    log.verbose("Block all web requests except:", allowedUrls);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const requestUrl = details.url.replaceAll("\\", "/");
      const existsInAllowed = allowedUrls.find((allowedUrl) => requestUrl.startsWith(allowedUrl));
      if (existsInAllowed) {
        callback({ cancel: false });
      } else {
        log.warn(`Blocked web request url: ${requestUrl}}`);
        callback({ cancel: true });
      }
    });
  }

  // configure shortcuts
  {
    // register shortcut to reload
    if (
      !globalShortcut.register("CommandOrControl+Shift+R", () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          log.info("Reload window");
          focusedWindow.reload();
        }
      })
    ) {
      log.warn("Failed to register shortcut: CommandOrControl+R");
    }
  }

  // register ipc handlers
  log.verbose("Register IPC handlers...");
  registerIpcHandlers();

  // create window
  log.info("Creating window...");
  mainWindow = new StatefullBrowserWindow({
    // configure window
    title: "Mav's RC",
    darkTheme: true,
    //titleBarOverlay: true,
    titleBarOverlay: false,
    autoHideMenuBar: true,
    fullscreenable: true,
    enableLargerThanScreen: false,
    hasShadow: true,
    minWidth: 600,
    minHeight: 420,

    webPreferences: {
      preload: currentPath().join(__dirname, "preload.js"),

      // web features
      devTools: devTools,
      enableWebSQL: false,
      spellcheck: false,

      // security
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      nodeIntegrationInWorker: false,
      sandbox: true,
    },

    show: false,
    backgroundColor: "#000",
    //  backgroundMaterial: 'auto',
  });

  // to improve security, dont navigate away when in production
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.on("will-navigate", (event, url) => {
      event.preventDefault();
      log.warn(`Main window tried to navigate to '${url}' which was prevented`);
    });
  }

  // show when ready
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  // and load the index.html of the app.
  const relativeIndexHtmlFilePath = "/src/renderer/index.html";
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    log.info(`Development Mode. Load from ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + relativeIndexHtmlFilePath);
  } else {
    const indexHtmlFilePath = currentPath().join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/${relativeIndexHtmlFilePath}`);
    log.info(`Producation Mode. Load index.html from ${indexHtmlFilePath}`);
    mainWindow.loadFile(indexHtmlFilePath);
  }

  // open dev tools
  if (devTools) {
    setTimeout(() => {
      mainWindow.webContents.openDevTools({
        mode: "detach",
        activate: true,
      });
    }, 1000);
  }

  // seems good
  log.info("Seems good");
});
