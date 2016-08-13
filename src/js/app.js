const PythonShell = require('python-shell');
const OS = require('os');
const fs = require('fs-extra');
const {shell} = require('electron');
const pug = require('pug');
const connect = require('connect');
const serveStatic = require('serve-static');
const XLSX = require('xlsx');
const request = require('request');
const url = require('url');
const path = require('path');
const fis = require('fast-image-size');

/*global FileReaderJS,ImageFile*/
angular.module('authoringTool', ['components'])
    .controller('MainController', function($scope, $sce, $timeout, languageService, dataService, markerService) {

        $scope.languageService = languageService;
        $scope.markerService = markerService;

        $scope.dataService = dataService;
        $scope.step = 1;
        $scope.processing = false;

        $scope.previewIsReady = false;

        // TODO: remove test values
        $scope.mapOpts = {
            /*
            bounds: {
                northWest: [52.777, 12.916],
                southEast: [52.266, 13.938]
            },
            aoiBounds: {
                northWest: [52.777, 12.916],
                southEast: [52.266, 13.938]
            },
            */
            bounds: {
                northWest: [],
                southEast: []
            },
            aoiBounds: {
                northWest: [],
                southEast: []
            },
            thumbnailSize: 10,
            tileSize: 512,
            minTileSize: 128,
            zoom: [0.2, 1.5],
            extension: "jpg",
            markerData: {}
        };

        $scope.tileSizes = [128, 256, 512, 1024];
        $scope.minTileSizes = [32, 64, 128, 256, 512];
        $scope.extensions = ["jpg", "png"];
        $scope.doNotOverwriteAoiBounds = false;

        $scope.wasSelected = () => {
            $scope.doNotOverwriteAoiBounds = true;
        };

        $scope.boundsChanged = () => {
            if (!$scope.doNotOverwriteAoiBounds) {
                $scope.mapOpts.aoiBounds = angular.copy($scope.mapOpts.bounds);
            }
        };

        $scope.markersDone = () => {
            $scope.markerService.getMarkerData(this.tmpDir, (markerData) => {
                $scope.mapOpts.markerData = {
                    "marker": markerData
                };
                var html = pug.renderFile(__dirname + '/project-template/index.pug', {
                    pretty: true,
                    options: {
                        aoiBounds: $scope.mapOpts.aoiBounds,
                        bounds: $scope.mapOpts.bounds,
                        center: this.getCenterOfBounds($scope.mapOpts.aoiBounds),
                        markerData: $scope.mapOpts.markerData
                    }
                });
                fs.writeFileSync(this.tmpDir + "index.html", html);
                $scope.step++;
                document.getElementById("previewWebview").reload();
            });
        };

        $scope.next = () => {
            $scope.processing = true;
            this.tmpDir = OS.tmpdir() + "/MappedJS/";
            fs.ensureDirSync(this.tmpDir);
            const allPaths = $scope.dataService.getPaths();
            var pyOptions = {
                args: [
                    ...['-i'],
                    ...$scope.dataService.getPaths(),
                    ...['-o', this.tmpDir],
                    ...['-p', 'tiles/'],
                    ...['-c', 'True'],
                    ...['-t', $scope.mapOpts.thumbnailSize],
                    ...['-s', $scope.mapOpts.tileSize],
                    ...['-m', $scope.mapOpts.minTileSize],
                    ...['-e', $scope.mapOpts.extension],
                    ...['-z', $scope.mapOpts.zoom[0], $scope.mapOpts.zoom[1]]
                ],
                scriptPath: this.tmpDir
            };

            fs.copySync(__dirname + '/../node_modules/mjs-imageslicer/imageslicer.py', pyOptions.scriptPath + "imageslicer.py");

            PythonShell.run('imageslicer.py', pyOptions, (err, res) => {
                if (err) {
                    console.error(err);
                }
                var html = pug.renderFile(__dirname + '/project-template/index.pug', {
                    pretty: true,
                    options: {
                        aoiBounds: $scope.mapOpts.aoiBounds,
                        bounds: $scope.mapOpts.bounds,
                        center: this.getCenterOfBounds($scope.mapOpts.aoiBounds),
                        markerData: $scope.mapOpts.markerData
                    }
                });
                fs.writeFileSync(this.tmpDir + "index.html", html);
                fs.copySync(__dirname + "/../node_modules/mjs-plugin/img", this.tmpDir + "img/");
                fs.copySync(__dirname + "/../node_modules/mjs-plugin/dist/js/mappedJS.min.js", this.tmpDir + "js/mappedjs.min.js");
                fs.copySync(__dirname + "/../node_modules/mjs-plugin/dist/styles/mappedJS.min.css", this.tmpDir + "styles/mappedjs.min.css");

                //shell.showItemInFolder(this.tmpDir);

                connect().use(serveStatic(this.tmpDir)).listen(8888, () => {
                    $scope.processing = false;
                    $scope.previewIsReady = true;
                    $scope.step = 2;
                    $scope.$apply();
                });

            });
        };

        this.getCenterOfBounds = function(b) {
            const lat = (b.northWest[0]+b.southEast[0]) / 2;
            const lng = (b.northWest[1]+b.southEast[1]) / 2;
            return {
                "lat": lat,
                "lng": lng
            };
        };

        $scope.hasFiles = function() {
            return $scope.dataService.hasFiles;
        };

        this.getLocale = function(word) {
            return $sce.trustAsHtml($scope.languageService.getWord(word));
        };

    })
    .controller('DataController', function($scope, $timeout, excelService) {
        $scope.excelService = excelService;

        $scope.dataSelected = function(data) {
            const currentFile = data.files[0].path;
            const excelFile = XLSX.readFile(currentFile);
            $scope.excelService.workbook = excelFile;
            $scope.excelService.sheets = {};
            $scope.excelService.header = [];
            $scope.excelService.body = {};
            $scope.excelService.sheetnames = excelFile["SheetNames"];
            for (const [i, name] of excelFile["SheetNames"].entries()) {
                const sheet = excelFile["Sheets"][name];
                $scope.excelService.sheets[name] = XLSX.utils.sheet_to_json(sheet, {header: 1});
                $scope.excelService.body[name] = XLSX.utils.sheet_to_json(sheet);
                for (const [j, column] of $scope.excelService.sheets[name][0].entries()) {
                    $scope.excelService.header.push(name + ":" + column);
                }
            }
            $scope.$parent.step = 3;
            $scope.$apply();
        };

    })
    .controller('MarkerController', function($scope, $timeout, markerService, excelService) {
        $scope.markerService = markerService;
        $scope.excelService = excelService;

        $scope.marker = $scope.markerService.marker;

        $scope.createLabelGroup = () => {
            $scope.markerService.addGroup();
        };

        $scope.changePosition = (m, pos) => {
            const existInArray = m.columnPosition.indexOf(pos);
            if (existInArray < 0) {
                m.columnPosition.push(pos);
            } else {
                m.columnPosition.slice(existInArray, 1);
            }
        };

        $scope.changeType = (m) => {
            delete m.text;
            delete m.icon;
            if (m.type.text) m.text = angular.copy(m.type.text);
            if (m.type.icon) m.icon = angular.copy(m.type.icon);
        };

    })
    .controller('MapCreationController', function($scope, $timeout, dataService) {

        var fROpts = {
            dragClass: "drag",
            readAsDefault: "DataURL",
            accept: "image/(png|jpeg)",
            on: {
                beforestart: function(file) {
                    var imageFile = new ImageFile({
                        filesize: file.extra.prettySize,
                        path: file.path,
                        name: file.name
                    });
                    _this.addFile(imageFile);
                },
                load: function(e, file) {
                    for (var i in dataService.files) {
                        var currentFile = dataService.files[i];
                        if (currentFile.path === file.path) {
                            currentFile.addImageData(e.target.result);
                        }
                    }
                },
                error: function(e, file) {
                    // TODO: Catch
                },
                abort: function(e, file) {
                    // TODO: Catch
                },
                skip: function(e, file) {
                    // TODO: Catch
                },
                groupend: function(group) {
                    $timeout(function() {
                        for (var i in dataService.files) {
                            var current = dataService.files[i];
                            if (!current.isLoaded && !current.isLoading) {
                                current.load(function() {
                                    $scope.dataService.files.sort((file1, file2) => {
                                        return file1.width - file2.width;
                                    });
                                });
                            }
                        }
                    }, 800);
                }
            }
        };

        var _this = this;
        $scope.dataService = dataService;

        $scope.files = dataService.files;

        $scope.delete = function(i) {
            $scope.dataService.files.splice(i, 1);
            $scope.dataService.hasFiles = $scope.files.length > 0;
        };

        this.init = function(elem) {
            $scope.upload = document.getElementById(elem);
            $scope.uploadInput = document.getElementById("input-"+elem);
            FileReaderJS.setupDrop($scope.upload, fROpts);
            FileReaderJS.setupInput($scope.uploadInput, fROpts);
            FileReaderJS.setSync(true);
        };

        this.uploadClickHandler = function() {
            $timeout(function() {
                document.querySelector('#input-upload').click();
            },0);
        };

        this.addFile = function(file) {
            $scope.dataService.files.push(file);
            $scope.dataService.hasFiles = $scope.files.length > 0;
        };

    })
    .service("dataService", function() {
        this.hasFiles = false;
        this.files = [];

        this.getPaths = function() {
            var files = [];
            for (var i in this.files) {
                files.push(this.files[i].path);
            }
            return files;
        };
    })
    .service("excelService", function() {
        this.sheets = {};
    })
    .service("markerService", function(excelService, imgLoaderService) {
        this.marker = [];

        this.types = {
            "icon": {
                icon: {
                    type: "image",
                    size: 5,
                    offset: [0, 0],
                    url: ""
                }
            },
            "label": {
                text: {
                    color: "#333333",
                    offset: [0, 5],
                    align: "center",
                    baseline: "hanging",
                    font: ["normal", "400", 10, "Arial"]
                }
            },
            "icon & label": {
                text: {
                    color: "#333333",
                    offset: [0, 5],
                    align: "center",
                    baseline: "hanging",
                    font: ["normal", "400", 10, "Arial"]
                },
                icon: {
                    type: "image",
                    size: 5,
                    offset: [0, 0],
                    url: ""
                }
            }
        };

        this.iconTypes = [
            "image",
            "circle",
            "square"
        ];

        this.labelTemplate = {
            columnPosition: [],
            columnContent: "",
            columnURL: "",
            sheet: []
        };

        this.addGroup = () => {
            this.marker.push(angular.copy(this.labelTemplate));
        };

        this.getMarkerData = (dir, cb) => {
            this.urlsToDownload = [];
            const producedMarkers = [];
            for (const [i, group] of this.marker.entries()) {
                const data = excelService.body[group.sheet];
                for (const entry of data) {
                    let currentMarker = {};
                    if (group.text) {
                        currentMarker = this.enrichText(currentMarker, group, entry);
                    }
                    if (group.icon) {
                        currentMarker = this.enrichIcon(currentMarker, group, entry, dir, i);
                    }
                    currentMarker = this.addPositionToMarker(currentMarker, group.columnPosition, entry);

                    producedMarkers.push(currentMarker);
                }
            }
            imgLoaderService.saveAllImagesLocally(this.urlsToDownload, dir, () => {
                cb(producedMarkers);
            });
        };

        this.enrichText = (cm, group, entry) => {
            cm.text = angular.copy(group.text);
            cm.text.font[2] = cm.text.font[2] + "px";
            cm.text.font = cm.text.font.join(" ");
            cm.text.content = entry[group.columnContent];
            return cm;
        };

        this.enrichIcon = (cm, group, entry, dir, i) => {
            cm.icon = angular.copy(group.icon);
            if (group.columnURL && group.columnURL !== "") {
                cm.icon.url = entry[group.columnURL];
                const loadUrl = url.parse(cm.icon.url);
                const parseFile = path.parse(cm.icon.url);
                if (parseFile.ext && parseFile.ext !== "") {
                    this.urlsToDownload.push({
                        url: loadUrl,
                        data: cm.icon
                    });
                }
            }
            return cm;
        };

        this.addPositionToMarker = (m, posNames, data) => {
            m.position = [];
            for (const pName of posNames) {
                const pos = data[pName].split(",");
                if (posNames.length === 1) {
                    m.position.push(parseFloat(pos[0]));
                    m.position.push(parseFloat(pos[1]));
                } else {
                    m.position.push([parseFloat(pos[0]), parseFloat(pos[1])]);
                }
            }
            return m;
        };

    })
    .service("imgLoaderService", function($http) {

        this.download = (u, i, dir, cb) => {
            let newPath = "";
            request(u, {encoding: 'binary'}, (error, response, body) => {
                let extension = "jpg";
                if (!error && response.statusCode === 200) {
                    if (response.headers["content-type"].includes("image")) {
                        extension = response.headers["content-type"].split("/")[1];
                    } else {
                        console.error("Header content-type was not corrent", response.headers["content-type"]);
                        cb(u, null);
                    }
                } else {
                    console.error(error);
                    cb(u, null);
                }
                newPath = 'icon_' + i + '.' + extension;
                fs.writeFileSync(dir + newPath, body, 'binary', (err) => {});
                cb(null, newPath);
            });
        };

        this.copyFile = (u, i, dir, cb) => {
            let newPath = "";
            let errorOccured = true;
            if (u.path) {
                errorOccured = false;
                const copyPath = path.parse(u.path);
                if (copyPath.ext && copyPath.ext !== "") {
                    newPath = 'icon_' + i + copyPath.ext;
                    fs.copySync(u.path, dir + newPath, {clobber: true}, (err) => {
                        if (err) {
                            errorOccured = true;
                            console.error(err);
                        }
                    });
                } else {
                    errorOccured = true;
                    console.error("No extension found!");
                }
            }
            (errorOccured) ? cb(u, null) : cb(null, newPath);
        };

        this.saveAllImagesLocally = (array, dir, cb) => {

            this.failedUrls = [];
            const subdir = "images/";
            dir = dir + subdir;
            fs.ensureDirSync(dir);

            let filesToDownload = array.length;
            this.filesDownloaded = 0;

            for (const [i, u] of array.entries()) {
                const downloadURL = url.parse(u.url);
                if (downloadURL.protocol && downloadURL.protocol.includes("http")) {
                    this.download(downloadURL.href, i, dir, (failedUrl, newURL) => {
                        u.data.url = subdir + newURL;
                        const size = fis(path.resolve(dir, newURL));
                        u.data.size = [size.width, size.height];
                        this.copyCallback(failedUrl, filesToDownload, cb);
                    });
                } else {
                    this.copyFile(downloadURL, i, dir, (failedUrl, newURL) => {
                        u.data.url = subdir + newURL;
                        const size = fis(path.resolve(dir, newURL));
                        u.data.size = [size.width, size.height];
                        this.copyCallback(failedUrl, filesToDownload, cb);
                    });
                }
            }
        };

        this.copyCallback = (failedUrl, filesToDownload, cb) => {
            if (failedUrl) {
                this.failedUrls.push(failedUrl);
            }
            this.filesDownloaded++;
            if (filesToDownload === this.filesDownloaded) {
                cb();
            }
        };
    })
    .service("languageService", function($http) {
        this.changeLanguage = function() {
            this.loadLanguage();
        };

        this.getUrl = function() {
            return this.path + this.activeLanguage + '.json';
        };

        this.getWord = function(word) {
            return (this.locale && this.locale[word]) ? this.locale[word] : "";
        };

        this.loadLanguage = function() {
            if (this.languages[this.activeLanguage].data) {
                this.locale = this.languages[this.activeLanguage].data;
            }
            var _this = this;
            $http.get(this.getUrl())
                .success(function(data) {
                    _this.languages[_this.activeLanguage].data = data;
                    _this.locale = _this.languages[_this.activeLanguage].data;
                })
                .error(function(error) {
                    console.log(error);
                });
        };

        this.path = "lang/";
        this.languages = {
            "en-EN": {
                short: "en-EN",
                name: "English"
            },
            "de-DE": {
                short: "de-DE",
                name: "Deutsch"
            }
        };

        this.defaultLanguage = this.languages['en-EN'].short;
        this.activeLanguage = this.defaultLanguage;
        this.loadLanguage();

    });
