const {
    Menu, app, BrowserWindow
} = require('electron');

require('electron-context-menu')({
    labels: {
        cut: 'Cut',
        copy: 'Copy',
        paste: 'Paste',
        save: 'Save Image',
        copyLink: 'Copy Link',
        inspect: 'Inspect'
    }
});

const argv = require('minimist')(process.argv.slice(2))["_"];
const settings = {
    debug: argv.indexOf("debug") > -1
};

let win;

const menuItems = [
    {
        label: 'MappedJS',
        submenu: [
            {
                label: 'About MappedJS',
                selector: 'orderFrontStandardAboutPanel:'
            }, {
                type: 'separator'
            }, {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: () => {
                    app.quit();
                }
            }
        ]
    }, {
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                selector: 'undo:'
            }, {
                label: 'Redo',
                accelerator: 'Shift+CmdOrCtrl+Z',
                selector: 'redo:'
            }, {
                type: 'separator'
            }, {
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                selector: 'cut:'
            }, {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                selector: 'copy:'
            }, {
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                selector: 'paste:'
            }, {
                label: 'Select all',
                accelerator: 'CmdOrCtrl+A',
                selector: 'selectAll:'
            }, {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click(item, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.reload();
                    }
                }
            }
        ]
    }
];

function createWindow() {
    win = new BrowserWindow({
        width: 1600,
        height: 800,
        backgroundColor: '#1d1e1e',
        title: "MappedJS Authoring Tool",
        enableLargerThanScreen: true,
        darkTheme: true,
        webPreferences: {
            webSecurity: false,
            defaultFontFamily: "sansSerif",
            defaultEncoding: "UTF-8"
        }
    });
    win.loadURL(`file://${__dirname}/index.html`);
    if (settings.debug) win.webContents.openDevTools();
    win.on('closed', () => {
        win = null;
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuItems));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
