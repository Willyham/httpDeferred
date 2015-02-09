describe('Test HTTPDeferred lib', function(){

  var requests = [];
  var xhr = null;

  beforeEach(function(){
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = function (xhr) {
      requests.push(xhr);
    };
  });

  afterEach(function(){
    xhr.restore();
  });

  var _respond = function (request, code) {
    return request.respond(code, [], '{}');
  };

  it('Should proxy .done calls', function(){
    var testCall = new HTTPDeferred($.ajax('success'));
    var doneFunc = sinon.spy();
    var failFunc = sinon.spy();
    testCall.done(doneFunc);
    testCall.fail(failFunc);
    requests[0].respond(200, {});
    chai.expect(doneFunc.called).to.eql(true);
    chai.expect(failFunc.called).to.eql(false);
  });

  it('Should proxy .fail calls', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var doneFunc = sinon.spy();
    var failFunc = sinon.spy();
    testCall.done(doneFunc);
    testCall.fail(failFunc);
    _respond(requests[0], 500);
    chai.expect(doneFunc.called).to.eql(false);
    chai.expect(failFunc.called).to.eql(true);
  });

  it('Should proxy .always calls', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var alwaysFunc = sinon.spy();
    testCall.always(alwaysFunc);
    requests[0].respond(200, {});
    chai.expect(alwaysFunc.called).to.eql(true);
  });

  it('Should proxy .then calls correctly, success case', function() {
    var testCall = new HTTPDeferred($.ajax('success'));
    var doneFunc = sinon.spy();
    var failFunc = sinon.spy();
    testCall.then(doneFunc, failFunc);
    requests[0].respond(200, {});
    chai.expect(doneFunc.called).to.eql(true);
    chai.expect(failFunc.called).to.eql(false);
  });

  it('Should proxy .then calls correctly, fail case', function() {
    var testCall = new HTTPDeferred($.ajax('fail'));
    var doneFunc = sinon.spy();
    var failFunc = sinon.spy();
    testCall.then(doneFunc, failFunc);
    _respond(requests[0], 500);
    chai.expect(doneFunc.called).to.equal(false);
    chai.expect(failFunc.called).to.equal(true);
  });

  it('Should handle specified status codes', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var handleFunc = sinon.spy();
    testCall.handle([123], handleFunc);
    _respond(requests[0], 123);
    chai.expect(handleFunc.called).to.eql(true);
  });

  it('Shouldn\'t handle unspecified status codes', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var handleFunc = sinon.spy();
    testCall.handle([123], handleFunc);
    requests[0].respond(200, {});
    chai.expect(handleFunc.called).to.eql(false);
  });

  it('Should handle multiple specified status codes', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var handleFunc = sinon.spy();
    testCall.handle([123, 456], handleFunc);
    _respond(requests[0], 123);
    chai.expect(handleFunc.called).to.eql(true);
    chai.expect(handleFunc.calledOnce).to.eql(true);
  });

  it('Shouldn\'t fail if caught with handle', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var failFunc = sinon.spy();
    var handleFunc = sinon.spy();
    testCall.handle([500], handleFunc);
    testCall.fail(failFunc);
    _respond(requests[0], 500);
    chai.expect(handleFunc.called).to.eql(true);
    chai.expect(handleFunc.calledOnce).to.eql(true);
    chai.expect(failFunc.called).to.eql(false);
  });

  it('Should call fail if unhandled', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var failFunc = sinon.spy();
    var handleFunc = sinon.spy();
    testCall.handle([500], handleFunc);
    testCall.fail(failFunc);
    _respond(requests[0], 555);
    chai.expect(handleFunc.called).to.eql(false);
    chai.expect(failFunc.called).to.eql(true);
  });

  it('Should call always if handled', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var handleFunc = sinon.spy();
    var alwaysFunc = sinon.spy();
    testCall.handle([500], handleFunc);
    testCall.always(alwaysFunc);
    _respond(requests[0], 500);
    chai.expect(handleFunc.called).to.eql(true);
    chai.expect(alwaysFunc.called).to.eql(true);
  });

  it('Should call multiple handle functions', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var handleFunc = sinon.spy();
    var handleFunc2 = sinon.spy();
    testCall.handle([500], handleFunc);
    testCall.handle([500], handleFunc2);
    _respond(requests[0], 500);
    chai.expect(handleFunc.called).to.eql(true);
    chai.expect(handleFunc2.called).to.eql(true);
  });

  it('Should not keep calling handle functions if stopHandling is called', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var handleFunc = sinon.spy();
    testCall.handle([500], function(){
      return testCall.stopHandling();
    });
    testCall.handle([500], handleFunc);
    _respond(requests[0], 500);
    chai.expect(handleFunc.called).to.eql(false);
  });

  it('Should call unhandled if there was no handler specified', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var unhandledFunc = sinon.spy();
    testCall.unhandled(unhandledFunc);
    _respond(requests[0], 500);
    chai.expect(unhandledFunc.called).to.eql(true);
  });

  it('Should call unhandled if there was no matching handler specified', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var unhandledFunc = sinon.spy();
    testCall.unhandled(unhandledFunc);
    testCall.handle([401,402], function(){});
    _respond(requests[0], 500);
    chai.expect(unhandledFunc.called).to.eql(true);
  });

  it('Should not call unhandled if there was a matching handler specified', function(){
    var testCall = new HTTPDeferred($.ajax('fail'));
    var unhandledFunc = sinon.spy();
    testCall.handle([401,402], function(){});
    testCall.unhandled(unhandledFunc);
    _respond(requests[0], 401);
    chai.expect(unhandledFunc.called).to.eql(false);
  });

  it('Should work with $.when', function(){
    var testCall = new HTTPDeferred($.ajax('test'));
    var testCall2 = new HTTPDeferred($.ajax('test2'));
    var allDone = sinon.spy();
    $.when(testCall, testCall2).done(allDone);
    requests[0].respond(200, {});
    requests[1].respond(200, {});
    chai.expect(allDone.called).to.eql(true);
  });

  it('Should handle with $.when', function(){
    var testCall = new HTTPDeferred($.ajax('test'));
    var testCall2 = new HTTPDeferred($.ajax('test2'));
    var allDone = sinon.spy();
    var handleFunc = sinon.spy();
    testCall.handle([500], handleFunc);
    $.when(testCall, testCall2).done(allDone);
    _respond(requests[0], 500);
    requests[1].respond(123, {});
    chai.expect(allDone.called).to.eql(true);
    chai.expect(handleFunc.called).to.eql(true);
  });

  it('Should be chainable', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var handleFunc = sinon.spy();
    var chain = testCall.handle([123, 456], handleFunc);
    chai.expect(chain).to.eql(testCall);
  });

  it('Should work with progress/notify functions', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var progressSpy = sinon.spy();
    testCall.progress(progressSpy);
    testCall.notify(1, '2', false);
    chai.expect(progressSpy.calledWith(1, '2', false));
  });

  it('Should accept error codes as a number', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var errorCodes = testCall._parseErrorCodes(500);
    chai.expect(errorCodes).to.eql([500]);
  });

  it('Should accept error codes as an array', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var errorCodes = testCall._parseErrorCodes([401,402]);
    chai.expect(errorCodes).to.eql([401,402]);
  });

  it('Should accept error code groups as a string', function(){
    var testCall = new HTTPDeferred($.ajax('blah'));
    var errorCodes = testCall._parseErrorCodes('5XX');
    chai.expect(errorCodes).to.eql([500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 520, 521, 522, 523, 524, 598, 599]);
  });
});