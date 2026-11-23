const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PANEL_VIEW_TYPE = "perennial.tree";
const TICK_MS = 1000;
const MAX_TICK_GAP = 5000;
const TYPING_BOOST_MS = 165;
const STATE_FILE_NAME = "session.json";
const AUTO_OPEN_FILE_NAME = "auto-opened";

let extensionContext;
let session;
let statusBar;
let panel;
let panelReady = false;
let windowFocused = true;
let clock;
let lastTick = Date.now();
let storageDir;
let stateFile;
let autoOpenFile;

function activate(context) {
  extensionContext = context;
  storageDir = context.globalStorageUri.fsPath;
  stateFile = path.join(storageDir, STATE_FILE_NAME);
  autoOpenFile = path.join(storageDir, AUTO_OPEN_FILE_NAME);
  fs.mkdirSync(storageDir, { recursive: true });

  session = loadSharedSession();
  windowFocused = vscode.window.state.focused;
  lastTick = Date.now();
  console.log("[perennial] extension activated");

  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    25
  );
  statusBar.command = "perennial.openTree";
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("perennial.openTree", openTree),
    vscode.commands.registerCommand("perennial.togglePause", togglePause),
    vscode.commands.registerCommand("perennial.newTree", newTree),
    vscode.window.onDidChangeWindowState((state) => {
      windowFocused = Boolean(state.focused);
      advanceTime();
      updateStatus();
      postSync();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateStatus();
    })
  );

  clock = setInterval(() => {
    advanceTime();
    updateStatus();
    postSync();
  }, TICK_MS);
  context.subscriptions.push({
    dispose: () => clearInterval(clock),
  });

  updateStatus();

  // The first time the extension runs, open the tree so the connection is
  // immediately visible. A file-based sentinel means only one of several
  // simultaneously activating windows will open it.
  let firstRun = false;
  try {
    fs.writeFileSync(autoOpenFile, String(Date.now()), { flag: "wx" });
    firstRun = true;
  } catch {
    firstRun = false;
  }
  if (firstRun) {
    setTimeout(() => {
      if (!panel) {
        vscode.commands.executeCommand("perennial.openTree");
      }
    }, 500);
  }
}

function deactivate() {
  if (clock) {
    clearInterval(clock);
    clock = undefined;
  }
  return Promise.resolve();
}

function loadSharedSession() {
  const shared = readSharedSession();
  if (shared) return shared;

  const candidate = newSession();
  try {
    fs.writeFileSync(stateFile, JSON.stringify(candidate), { flag: "wx" });
    return candidate;
  } catch {
    return readSharedSession() || candidate;
  }
}

function readSharedSession() {
  if (!stateFile) return null;
  try {
    const raw = fs.readFileSync(stateFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.seed !== "number") return null;
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

function writeSharedSession() {
  if (!stateFile) return;
  session.updatedAt = Date.now();
  const payload = JSON.stringify(session);
  const temporary = `${stateFile}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, payload);
    fs.renameSync(temporary, stateFile);
  } catch {
    try {
      fs.writeFileSync(stateFile, payload);
    } catch {
      // A read-only global storage should not interrupt the tree.
    }
  }
}

function syncFromDisk() {
  const shared = readSharedSession();
  if (shared && shared.updatedAt > (session.updatedAt || 0)) {
    session = shared;
  }
}

function normalizeSession(value) {
  if (
    value &&
    typeof value.seed === "number" &&
    Number.isFinite(value.elapsedMs) &&
    Number.isFinite(value.growthMs)
  ) {
    return {
      seed: value.seed >>> 0,
      elapsedMs: Math.max(0, Math.round(value.elapsedMs)),
      growthMs: Math.max(0, Math.round(value.growthMs)),
      keys: Math.max(0, Math.round(Number(value.keys) || 0)),
      paused: Boolean(value.paused),
      createdAt: Number(value.createdAt) || Date.now(),
      updatedAt: Number(value.updatedAt) || 0,
    };
  }
  return newSession();
}

function newSession() {
  return {
    seed: crypto.randomBytes(4).readUInt32BE(0),
    elapsedMs: 0,
    growthMs: 0,
    keys: 0,
    paused: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function advanceTime() {
  const now = Date.now();
  const delta = Math.min(MAX_TICK_GAP, Math.max(0, now - lastTick));
  lastTick = now;

  syncFromDisk();

  if (!session.paused && windowFocused) {
    session.elapsedMs += delta;
    session.growthMs += delta;
    writeSharedSession();
  }
}

function isActive() {
  return !session.paused && windowFocused;
}

function updateStatus() {
  if (!statusBar) return;
  const icon = session.paused
    ? "$(debug-pause)"
    : windowFocused
      ? "$(symbol-color)"
      : "$(circle-slash)";
  statusBar.text = `${icon} Perennial ${formatClock(session.elapsedMs)}`;
  statusBar.tooltip = session.paused
    ? "Perennial is paused. Click to open the tree."
    : windowFocused
      ? "VS Code is feeding the tree. Click to open it."
      : "Focus VS Code to feed the tree. Click to open it.";
}

function saveState() {
  if (!extensionContext) return;
  syncFromDisk();
  writeSharedSession();
}

function openTree() {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    panelReady = true;
    postSync();
    return;
  }

  const mediaRoot = vscode.Uri.joinPath(extensionContext.extensionUri, "media");
  panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Perennial",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [mediaRoot],
    }
  );
  try {
    panel.webview.html = getWebviewHtml(panel.webview, mediaRoot);
  } catch (error) {
    panel.dispose();
    panel = undefined;
    vscode.window.showErrorMessage(
      `Perennial could not open: ${error.message || error}`
    );
    return;
  }
  panel.iconPath = vscode.Uri.joinPath(extensionContext.extensionUri, "icon.png");
  panelReady = false;
  console.log("[perennial] tree webview opened");

  panel.webview.onDidReceiveMessage((message) => {
    if (!message || typeof message.type !== "string") return;

    if (message.type === "perennial:ready") {
      panelReady = true;
      console.log("[perennial] tree webview ready");
      postSync();
      return;
    }

    if (message.type === "perennial:typing") {
      const count = Math.max(
        0,
        Math.min(64, Math.floor(Number(message.count) || 0))
      );
      if (!count || session.paused) return;
      session.keys += count;
      session.growthMs += count * TYPING_BOOST_MS;
      updateStatus();
      postSync();
      saveState();
      return;
    }

    if (message.type === "perennial:control") {
      if (message.action === "pause") {
        advanceTime();
        session.paused = true;
      } else if (message.action === "resume") {
        lastTick = Date.now();
        session.paused = false;
      } else if (message.action === "reset") {
        session = newSession();
        lastTick = Date.now();
      }
      updateStatus();
      saveState();
      postSync();
    }
  });

  panel.onDidChangeViewState(() => {
    if (panel && panel.visible && panelReady) {
      postSync();
    }
  });

  panel.onDidDispose(() => {
    panel = undefined;
    panelReady = false;
    saveState();
  });
}

function postSync() {
  if (!panel || !panelReady) return;
  panel.webview.postMessage({
    type: "perennial:sync",
    seed: session.seed,
    elapsedMs: session.elapsedMs,
    growthMs: session.growthMs,
    keys: session.keys,
    paused: session.paused,
    active: isActive(),
    createdAt: session.createdAt,
  });
}

function togglePause() {
  advanceTime();
  session.paused = !session.paused;
  lastTick = Date.now();
  if (!session.paused) {
    windowFocused = vscode.window.state.focused;
  }
  updateStatus();
  saveState();
  postSync();
}

function newTree() {
  session = newSession();
  lastTick = Date.now();
  updateStatus();
  saveState();
  postSync();
  if (!panel) {
    openTree();
  }
}

function getWebviewHtml(webview, mediaRoot) {
  const indexPath = path.join(mediaRoot.fsPath, "index.html");
  let html;
  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch {
    throw new Error(
      "Perennial media is missing. Run `npm run sync-media` inside vscode-extension."
    );
  }

  const baseUri = `${webview.asWebviewUri(mediaRoot).toString()}/`;
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data: blob:`,
    `font-src ${webview.cspSource} data: https://fonts.gstatic.com`,
    `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
    `script-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource} https://fonts.googleapis.com https://fonts.gstatic.com`,
  ].join("; ");

  return html.replace(
    "<head>",
    `<head>\n  <base href="${baseUri}">\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`
  );
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

module.exports = {
  activate,
  deactivate,
};
