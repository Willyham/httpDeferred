(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['underscore'], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('underscore'));
  } else {
    // Browser globals (root is window)
    root.HTTPDeferred = factory(root._);
  }
}(this, function (_) {
  'use strict';

  /**
   * A wrapper around all of our API calls, extending the ajax request handler with knowledge
   * about our error codes. Can be used for both Backbone and general API calls.
   * @param {Deferred} request The original request
   * @returns {HTTPDeferred} This object for chainability
   * @constructor
   */
  function HTTPDeferred(request) {
    this._stopPropagation = false;
    this._handlers = [];
    this._request = request;

    this.hasBeenHandled = false;
    return this;
  }

  /**
   * A utility function to expose a more readable interface for stopping propagation
   * @returns {Boolean} returns false
   */
  HTTPDeferred.prototype.stopHandling = function () {
    return false;
  };

  /**
   * Proxy the done function
   * @param {Function} doneFunction Function to call when request is done
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.done = function (doneFunction) {
    this._request.done(doneFunction);
    return this;
  };

  /**
   * Allow the caller to handle any matching status codes with a given function.
   * This assumes that the status codes are error codes, as the deferred is rejected on match
   * @param {Number|Number[]} errorCodes The error codes to handle with the handle function
   * @param {Function} handleFunction The function to run for a matching error code.
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.handle = function (errorCodes, handleFunction) {
    var self = this;
    errorCodes = _.isArray(errorCodes) ? errorCodes : [errorCodes];
    this._handlers = _.union(this._handlers, errorCodes);
    this._request.fail(function (response) {
      var errorCode = response.status;
      if (_.contains(errorCodes, errorCode) && !self._stopPropagation) {
        var responseJSON = self._parseResponse(response);
        self.hasBeenHandled = true;
        var handleResult = handleFunction.call(self, responseJSON.message);
        self._stopPropagation = Boolean(handleResult === false);
      }
    });
    return this;
  };

  /**
   * Add a handler which is only ever run when there are no registered handler for that error code
   * As opposed to the fail, which will not run only if the request has *already* been handled.
   * @param {Function} unhandledFunction Function to run when there is no error handler.
   */
  HTTPDeferred.prototype.unhandled = function (unhandledFunction) {
    var self = this;
    this._request.fail(function (response) {
      var errorCode = response.status;
      if (!_.contains(self._handlers, errorCode)) {
        self._stopPropagation = true;
        var responseJSON = self._parseResponse(response);
        unhandledFunction.call(self, responseJSON.message);
      }
    });
  };

  /**
   * Proxy the fail function
   * @param {Function} failFunction Function to call when request fails
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.fail = function (failFunction) {
    var self = this;
    this._request.fail(function (response) {
      if (!self.hasBeenHandled) {
        var responseJSON = self._parseResponse(response);
        failFunction.call(self, responseJSON.message);
      }
    });
    return this;
  };

  /**
   * Proxy the always function
   * @param {Function} alwaysFunction Function to call after each request
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.always = function (alwaysFunction) {
    this._request.always(alwaysFunction);
    return this;
  };

  /**
   * Try and parse a JSON response. If we can't return the format we're expecting with an error message
   * @param {Object} response The response from the server
   * @returns {Object}
   * @private
   */
  HTTPDeferred.prototype._parseResponse = function (response) {
    try {
      return JSON.parse(response.responseText);
    }
    catch (error) {
      return {
        message: 'Unable to parse response text as JSON ' + response.responseText
      };
    }
  };

  return HTTPDeferred;
}));