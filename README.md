httpDeferred
============

Gracefully handle errors from your RESTful JSON API with promises. 
For more information see http://willdemaine.ghost.io/handling-restful-http-errors-with-promises/


Install
----

To install run: `bower install httpDeferred`

HttpDeferred is a UMD compliant module which requires [underscore](www.underscorejs.com). While it doesn't strictly require jQuery, it does expect a jQuery like promise interface (e.g. 'done','fail','always' methods). It is likely that this module will only be useful for people using jQuery's promises already.

To use with requireJS simply set up your paths:

```javascript
requirejs.config({
    "paths": {
      'underscore': 'bower_components/underscore/underscore',
      'httpDeferred': 'bower_components/httpDeferred/httpDeferred'
    }
});
```

Then use as module:


```javascript
define(['jquery', 'httpDeferred'], function($, HTTPDeferred) {
  var test = new HTTPDeferred($.ajax('/server/something'));
  test.done(function(result){
     //Something with result.
  });
});

```

Uses
----

HTTPDeferred is designed to simplify error handling when working with a RESTful JSON API. Instead of writing:

```javascript
var updateName = API.updateName('will');  
updateName.fail(function(reason){  
  var errorCode = reason.status;
  if(errorCode == 406){
    handleFormError(reason.responseText);
  }
  else if (errorCode == 403){
    handleUnauthorisedUser(reason.responseText);
  }
});
```

You can write:

```javascript
var updateName = API.updateName('will');  
updateName.handle([403], handleUnauthorisedUser);  
updateName.handle([406], handleFormError);  
updateName.fail(function(){  
  // Failed but wasn't 403 or 406.
});
```

You can also handle multiple statuses with the same function:

```javascript
var updateName = API.updateName('will');  
updateName.handle([401, 403, 500], function(error){
  //Response was either 401, 403 or 500.
});
```

Notes on usage:

 - Fail will not be called if a response is handled by a handler function.
 - Multiple handlers for the same response code will both be called, unless the the previous one returns `httpDeferred.stopHandling()`
 - You cannot handle a 200. You can only handle error codes (i.e. non 2XX).


Examples
-----

HTTPDeferred works well with jQuery and therefore Backbone. It is often most useful when all ajax requests are wrapped in an HTTPDeferred object. For example, we might want to ensure that all calls to our API are authenticated. Any call to the server can respond with a `401`, so instead of handling that case in each call, we register the handler like so:


```javascript
var _ajax = $.ajax;

// Wrap all ajax calls in HTTPDeferred and register a 401 handler.
registerGlobalErrorHandlers: function(){  
  $.ajax = _.wrap(_ajax, function(ajax, url, options){
    var request = new HTTPDeferred(ajax(url, options));

    // If we get a 401, redirect to the logic page.
    request.handle([401], function(){
      Backbone.Events.trigger(Events.auth.pleaseAuthenticate);
    });

    return request;
  });
}
```

Now, we simply use backbone like normal:

```javascript
var deliciousRum = new RumModel({
  name: 'Angostura',
  year: 1824
});
showLoadingSpinner();

var saveRum = deliciousRum.save();
saveRum.done(function(){
  //Yarr!
});
saveRum.handle([406], function(error){
  // There was a problem with our data
});
saveRum.fail(functon(error){
  // Something else went wrong
});
saveRum.always(function(){
  hideLoadingSpinner();
});
```

API
----
For a full API reference, please see the source code. It is not that complex and has plenty of comments.


Contributions
---
Pull requests and contributions/thoughts are welcome.
