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
