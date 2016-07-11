angular.module('components', [])
    .directive('mjslanguage', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {},
            controller: 'MainController',
            templateUrl: './components/language.html',
            replace: true
        };
    });
