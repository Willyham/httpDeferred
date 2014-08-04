(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'underscore'], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('jquery'), require('underscore'));
  } else {
    // Browser globals (root is window)
    root.HTTPDeferred = factory(root.$, root._);
  }
}(this, function ($, _) {
  'use strict';

  // Codes from http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
  var _errorCodes = {
    '4': [400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418,
      419, 420, 422, 423, 424, 425, 426, 428, 431, 440, 444, 449, 450, 451, 494, 495, 496, 497, 499],
    '5': [500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 520, 521, 522, 523, 524, 598, 599]
  };

  /**
   * A wrapper around all of our API calls, extending the ajax request handler with knowledge
   * about our error codes. Can be used for both Backbone and general API calls.
   * @param {Deferred} request The original request
   * @returns {HTTPDeferred} This object for chainability
   * @constructor
   */
  function HTTPDeferred(request){
    this._stopPropagation = false;
    this.hasBeenHandled = false;
    this._handlers = [];
    this._inner = new $.Deferred();

    var self = this;
    request.done(function(result){
      self._inner.resolveWith(this, [result]);
    });
    request.fail(function(result){
      self._inner.rejectWith(this, [result]);
    });
    return this;
  }

  /**
   * A utility function to expose a more readable interface for stopping propagation
   * @returns {Boolean} returns false
   */
  HTTPDeferred.prototype.stopHandling = function(){
    return false;
  };

  /**
   * Proxy the done function
   * @param {Function} doneFunction Function to call when request is done
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.done = function(doneFunction){
    this._inner.done(doneFunction);
    return this;
  };

  /**
   * Provide the ability to chain promises with 'then'. Because HTTPDeferred is just
   * a wrapper rather than a real promise implementation, using then will not return an
   * HTTPDeferred object, so you will lose the ability to chain HTTPDeferred methods like
   * 'handle' after calling this.
   * @param thenFunction The function to run after the promise is resolved
   * @returns {Promise}
   */
  HTTPDeferred.prototype.then = function(thenFunction){
    return this._inner.then(thenFunction);
  };

  /**
   * Allow the caller to handle any matching status codes with a given function.
   * This assumes that the status codes are error codes, as the deferred is rejected on match
   * @param {Number|Number[]} errorCodes The error codes to handle with the handle function
   * @param {Function} handleFunction The function to run for a matching error code.
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.handle = function(errorCodes, handleFunction){
    var self = this;
    errorCodes = this._parseErrorCodes(errorCodes);
    if(!errorCodes){
      throw new Error('Invalid error code supplied');
    }
    this._handlers = _.union(this._handlers, errorCodes);
    this._inner.fail(function(response){
      var errorCode = response.status;
      if(_.contains(errorCodes, errorCode) && !self._stopPropagation){
        var responseJSON = self._parseResponse(response);
        self.hasBeenHandled = true;
        var handleResult = handleFunction.call(self, responseJSON);
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
  HTTPDeferred.prototype.unhandled = function(unhandledFunction){
    var self = this;
    this._inner.fail(function(response){
      var errorCode = response.status;
      if(!_.contains(self._handlers, errorCode)){
        self._stopPropagation = true;
        var responseJSON = self._parseResponse(response);
        unhandledFunction.call(self, responseJSON);
      }
    });
  };

  /**
   * Proxy the fail function
   * @param {Function} failFunction Function to call when request fails
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.fail = function(failFunction){
    var self = this;
    this._inner.fail(function(response){
      if(!self.hasBeenHandled){
        var responseJSON = self._parseResponse(response);
        failFunction.call(self, responseJSON);
      }
    });
    return this;
  };

  /**
   * Proxy the progress function
   * @param {Function} progressFunc The function to call on notify
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.progress = function(progressFunc){
    this._inner.progress(progressFunc);
    return this;
  };

  /**
   * Notify the deferred of progress.
   * @param [arguments] The arguments to pass to notify
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.notify = function(){
    this._inner.notify.apply(this, arguments);
    return this;
  };

  /**
   * Proxy the always function
   * @param {Function} alwaysFunction Function to call after each request
   * @returns {HTTPDeferred} This object for chainability
   */
  HTTPDeferred.prototype.always = function(alwaysFunction){
    this._inner.always(alwaysFunction);
    return this;
  };

  /**
   * Get the error codes from the passed in value.
   * Supports:
   *  - A number: 400
   *  - An array: [400,402,404]
   *  - A string of the form '4XX' or '5XX'
   * @param {String|Number[]} errorCodes The errors codes.
   * @returns {Number[]} Parsed error codes
   * @private
   */
  HTTPDeferred.prototype._parseErrorCodes = function(errorCodes){
    if(_.isString(errorCodes)){
      return this._getErrorCodesFromString(errorCodes);
    }
    return _.isArray(errorCodes) ? errorCodes : [errorCodes];
  };

  /**
   * Get error codes from the given string.
   * The only supported strings are currently '4XX' and '5XX'.
   * @param {String} errorCodeString
   * @returns {Number[]} The parsed errors codes
   * @private
   */
  HTTPDeferred.prototype._getErrorCodesFromString = function(errorCodeString){
    var errorCodeRegex = /([4|5])XX/;
    var match = errorCodeString.match(errorCodeRegex);
    if(!match){
      return [];
    }
    var errorGroup = _errorCodes[match[1]];
    if(!_.isArray(errorGroup)){
      return [];
    }
    return errorGroup;
  };

  /**
   * Try and parse a JSON response. If we can't return the format we're expecting with an error message
   * @param {Object} response The response from the server
   * @returns {Object}
   * @private
   */
  HTTPDeferred.prototype._parseResponse = function(response){
    try {
      return JSON.parse(response.responseText);
    }
    catch(error){
      return {
        message: 'Unable to parse response text as JSON: ' + response.responseText + '. Code: ' + response.status
      };
    }
  };

  return HTTPDeferred;
}));
