require('./resources/testharness');

require('./reference-implementation/utils/streams-utils');

// This is updated till https://github.com/whatwg/streams/commit/ec5ffa036308d9f6350d2946560d48cdbf090939

let ReadableStreamReader = (new ReadableStream()).getReader().constructor;

function fakeWritableStream() {
  return {
    get closed() { return Promise.resolve(); },
    get ready() { return Promise.resolve(); },
    get state() { return 'closed' },
    abort(reason) { return Promise.resolve(); },
    close() { return Promise.resolve(); },
    write(chunk) { return Promise.resolve(); }
  };
}

function realReadableStream() {
    return new ReadableStream();
}

function fakeReadableStream() {
    return {
        cancel: function(reason) { return Promise.resolve(); },
        getReader: function() { return new ReadableStreamReader(new ReadableStream()); },
        pipeThrough: function(obj, options) { return obj.readable; },
        pipeTo: function() { return Promise.resolve(); },
        tee: function() { return [realReadableStream(), realReadableStream()]; }
    };
}

test(function() {
    var pipeToArguments;
    var thisValue = {
        pipeTo: function() {
            pipeToArguments = arguments;
        }
    };

    var input = { readable: {}, writable: {} };
    var options = {};
    var result = ReadableStream.prototype.pipeThrough.call(thisValue, input, options);

    assert_array_equals(pipeToArguments, [input.writable, options], 'correct arguments should be passed to thisValue.pipeTo');
    assert_equals(result, input.readable, 'return value should be the passed readable property');
}, 'ReadableStream.prototype.pipeThrough works generically on its this and its arguments');

test(function() {
    ReadableStream.prototype.pipeTo.call(fakeReadableStream(), fakeWritableStream()); // Check it does not throw.
}, 'ReadableStream.prototype.pipeTo works generically on its this and its arguments');

test(function() {
    var thisValue = null;
    var returnValue = { 'returned from': 'byteLength getter' };
    var chunk = {
        get byteLength() {
            return returnValue;
        }
    };

    assert_equals(ByteLengthQueuingStrategy.prototype.size.call(thisValue, chunk), returnValue);
}, 'ByteLengthQueuingStrategy.prototype.size should work generically on its this and its arguments');

test(function() {
    var thisValue = null;
    var chunk = {
        get byteLength() {
            throw new TypeError('shouldn\'t be called');
        }
    };

    assert_equals(CountQueuingStrategy.prototype.size.call(thisValue, chunk), 1);
}, 'CountQueuingStrategy.prototype.size should work generically on its this and its arguments');
