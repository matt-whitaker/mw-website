"use strict";

angular.module('mw.taxonomies-service', [])
  .service('taxonomiesService', [
    '$http', 'apiBase', 'customApiBase',
    function ($http, apiBase, customApiBase) {
      return Object.create({
        '$http': $http,
        apiBase: apiBase,
        customApiBase: customApiBase
      });
    }
  ]);