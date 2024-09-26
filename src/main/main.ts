import { app, BrowserWindow, globalShortcut, session } from "electron";
import path from "path";
import windowStateKeeper from "electron-window-state";
import { ConfigManager } from "./config-manager";
import { SshManager } from "./ssh-manager";
import log from "electron-log/main";
import { RemotesManager } from "./remotes-manager";
import { typedIpcMain } from "../shared/ipc/ipc-api";
import { registerIpcHandlers } from "./ipc-handlers";

// load configuration
const appVersion = app.getVersion();
log.info(`Starting app v${appVersion}...`);
export let configManager = new ConfigManager();

log.debug(`Configure logger with level: ${configManager.config.logLevel}`);
log.transports.console.level = configManager.config.logLevel;
const userDataPath = app.getPath("userData");
log.transports.file.resolvePathFn = () => path.join(userDataPath, "rc.log");
log.transports.file.level = configManager.config.logLevel;

// create managers
log.debug(`Create managers...`);
export let remotesManager = new RemotesManager(configManager);
export let sshManager = new SshManager(remotesManager);
export let mainWindow!: BrowserWindow; // will be assigned later

// configure close/dispose
{
  // handle creating/removing shortcuts on windows when installing/uninstalling.
  if (require("electron-squirrel-startup")) {
    log.info("Quit because squirrel");
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

      configManager = null;
      remotesManager = null;
      sshManager = null;
      mainWindow = null;

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
    let allowedUrls: string[];
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // in development, only allow our vite dev-server and the dev-tools as source
      allowedUrls = [
        MAIN_WINDOW_VITE_DEV_SERVER_URL,
        MAIN_WINDOW_VITE_DEV_SERVER_URL.replace("http://", "ws://"),
        "devtools://",
      ];
    } else {
      // in production, only allow file calls to the current directory
      allowedUrls = ["file:///" + app.getAppPath().replaceAll("\\", "/")];
    }

    // block outgoing requests for more security
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const requestUrl = details.url.replaceAll("\\", "/");
      const existsInAllowed = allowedUrls.find((allowedUrl) => requestUrl.startsWith(allowedUrl));
      if (existsInAllowed) {
        callback({ cancel: false });
      } else {
        callback({ cancel: true });
        log.warn(`Blocked web request url: ${requestUrl}}`);
      }
    });
  }

  // configure shortcuts
  {
    // register shortcut to reload
    if (
      !globalShortcut.register("CommandOrControl+R", () => {
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
  log.debug("Register IPC handlers...");
  registerIpcHandlers();

  // load the previous state with fallback to defaults
  log.debug("Restore window state...");
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1100,
    defaultHeight: 740,
    fullScreen: false,
    maximize: false,
  });

  // create window
  log.info("Creating window...");
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, "preload.js"),

      // web features
      devTools: MAIN_WINDOW_VITE_DEV_SERVER_URL != null, // only enable when debugging
      enableWebSQL: false,
      spellcheck: false,

      // security
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: true,
    },

    // set cached size and position
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: mainWindowState.x,
    y: mainWindowState.y,
    fullscreen: mainWindowState.isFullScreen,
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
    setTimeout(() => {
      mainWindow.webContents.openDevTools({
        mode: "detach",
        activate: true,
      });
    }, 1000);
  } else {
    const indexHtmlFilePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/${relativeIndexHtmlFilePath}`);
    log.info(`Producation Mode. Load index.html from ${indexHtmlFilePath}`);
    mainWindow.loadFile(indexHtmlFilePath);
  }

  // let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  mainWindowState.manage(mainWindow);

  // seems good
  log.info("Seems good");
});
