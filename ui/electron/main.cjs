/**
 * Context Bridge — Electron tray shell (menubar-style).
 * Loads the same Vite React UI with ?shell=tray
 * Patterns: sugarforever tray / max-mapper menubar (plain Tray + BrowserWindow).
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require('electron')
const path = require('node:path')

const isDev = !app.isPackaged && process.env.CB_ELECTRON_PROD !== '1'
const DEV_URL =
  process.env.CB_UI_URL ||
  (process.env.CB_SHOW === '1'
    ? 'http://127.0.0.1:5173/?shell=tray&mode=live'
    : 'http://127.0.0.1:5173/?shell=tray')
const POP_W = 400
const POP_H = 620

let tray = null
let win = null

function iconPath() {
  return path.join(__dirname, 'assets', 'tray.png')
}

function createWindow() {
  win = new BrowserWindow({
    width: POP_W,
    height: POP_H,
    show: false,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      search: 'shell=tray',
    })
  }

  win.on('blur', () => {
    if (process.env.CB_SHOW === '1') return
    if (!win?.webContents.isDevToolsOpened()) win?.hide()
  })
  win.on('closed', () => {
    win = null
  })
}

function toggleWindow() {
  if (!win) createWindow()
  if (win.isVisible()) {
    win.hide()
    return
  }
  const trayBounds = tray.getBounds()
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  })
  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - POP_W / 2,
  )
  const y = Math.round(trayBounds.y + trayBounds.height + 4)
  // clamp into work area
  const wa = display.workArea
  const cx = Math.min(Math.max(x, wa.x + 8), wa.x + wa.width - POP_W - 8)
  const cy = Math.min(y, wa.y + wa.height - POP_H - 8)
  win.setPosition(cx, Math.max(cy, wa.y + 8))
  win.show()
  win.focus()
}

function createTray() {
  const img = nativeImage.createFromPath(iconPath())
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
  tray.setToolTip('Context Bridge')
  tray.on('click', toggleWindow)
  tray.on('right-click', () => {
    const menu = Menu.buildFromTemplate([
      { label: 'Show / Hide', click: toggleWindow },
      { type: 'separator' },
      {
        label: 'Open mobile shell',
        click: () => {
          if (!win) createWindow()
          const url = isDev
            ? 'http://127.0.0.1:5173/?shell=mobile'
            : undefined
          if (url) win.loadURL(url)
          win.show()
        },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
    tray.popUpContextMenu(menu)
  })
}

// Linux often needs this for tray
app.disableHardwareAcceleration()
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide()
  createTray()
  createWindow()
  if (process.env.CB_SHOW === '1' && win) {
    win.show()
    win.focus()
    console.log('[cb-electron] CB_SHOW=1 visible', DEV_URL)
  }
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
})
