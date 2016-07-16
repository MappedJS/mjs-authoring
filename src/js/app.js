const PythonShell = require('python-shell');
const OS = require('os');
const fs = require('fs-extra');
const {shell} = require('electron');
const pug = require('pug');
const connect = require('connect');
const serveStatic = require('serve-static');

/*global FileReaderJS,ImageFile*/
angular.module('authoringTool', ['components'])
    .controller('MainController', function($scope, $sce, $timeout, languageService, dataService) {

        $scope.languageService = languageService;
        $scope.dataService = dataService;
        $scope.step = 1;
        $scope.processing = false;

        $scope.previewIsReady = false;

        // TODO: remove test values
        $scope.mapOpts = {
            bounds: {
                northWest: [52.777, 12.916],
                southEast: [52.266, 13.938]
            },
            thumbnailSize: 10,
            tileSize: 512,
            minTileSize: 128,
            zoom: [0.8, 1.2],
            extension: "jpg"
        };

        $scope.tileSizes = [128, 256, 512, 1024];
        $scope.minTileSizes = [32, 64, 128, 256, 512];
        $scope.extensions = ["jpg", "png"];

        $scope.next = () => {
            $scope.processing = true;
            var tmpDir = OS.tmpdir() + "/MappedJS/";
            const allPaths = $scope.dataService.getPaths();
            var pyOptions = {
                args: [
                    ...['-i'],
                    ...$scope.dataService.getPaths(),
                    ...['-o', tmpDir],
                    ...['-p', 'tiles/'],
                    ...['-c', 'True'],
                    ...['-t', $scope.mapOpts.thumbnailSize],
                    ...['-s', $scope.mapOpts.tileSize],
                    ...['-m', $scope.mapOpts.minTileSize],
                    ...['-e', $scope.mapOpts.extension],
                    ...['-z', $scope.mapOpts.zoom[0], $scope.mapOpts.zoom[1]]
                ]
            };
            PythonShell.run('./node_modules/mjs-imageslicer/imageslicer.py', pyOptions, (err, res) => {
                if (err) {
                    console.error(err);
                }
                var html = pug.renderFile('src/project-template/index.pug', {
                    pretty: true,
                    options: {
                        bounds: $scope.mapOpts.bounds,
                        center: this.getCenterOfBounds()
                    }
                });
                fs.writeFileSync(tmpDir + "index.html", html);
                fs.copySync("./node_modules/mjs-plugin/img", tmpDir + "img/");
                fs.copySync("./node_modules/mjs-plugin/dist/js/mappedJS.min.js", tmpDir + "js/mappedjs.min.js");
                fs.copySync("./node_modules/mjs-plugin/dist/styles/mappedJS.min.css", tmpDir + "styles/mappedjs.min.css");
                shell.showItemInFolder(tmpDir);

                connect().use(serveStatic(tmpDir)).listen(8888, () => {
                    $scope.processing = false;
                    $scope.previewIsReady = true;
                    $scope.step = 2;
                    $timeout(function(){
                        $scope.$apply();
                    }, 0);
                });

            });
        };

        this.getCenterOfBounds = function() {
            const lat = ($scope.mapOpts.bounds.northWest[0]+$scope.mapOpts.bounds.southEast[0]) / 2;
            const lng = ($scope.mapOpts.bounds.northWest[1]+$scope.mapOpts.bounds.southEast[1]) / 2;
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
                                    dataService.files.sort((file1, file2) => {
                                        return file1.width - file2.width;
                                    });
                                    $scope.$apply();
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
            dataService.files.splice(i, 1);
            $scope.dataService.hasFiles = $scope.files.length > 0;
            $timeout(function() {
                $scope.$apply();
            }, 0);
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
            dataService.files.push(file);
            $scope.dataService.hasFiles = $scope.files.length > 0;
            $timeout(function() {
                $scope.$apply();
            }, 0);
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
