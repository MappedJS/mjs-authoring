angular.module('components', [])
    .directive('mjslanguage', function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: './components/language.html',
            replace: true
        };
    })
    .directive('mjslistitem', function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: './components/listitem.html',
            replace: true
        };
    });
