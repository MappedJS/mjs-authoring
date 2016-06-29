const {
    app, BrowserWindow
} = require('electron');

const argv = require('minimist')(process.argv.slice(2))["_"];
const settings = {
    debug: argv.indexOf("debug") > -1
};

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 600
    });
    win.loadURL(`file://${__dirname}/index.html`);
    if (settings.debug) win.webContents.openDevTools();
    win.on('closed', () => {
        win = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
