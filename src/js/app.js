angular.module('authoringTool', ['components'])
    .controller('MainController', function($scope, $sce, languageService) {
        var ctrl = this;
        $scope.languageService = languageService;

        this.getLocale = function(word) {
            return $sce.trustAsHtml($scope.languageService.getWord(word));
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
                .success(function(data){
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
