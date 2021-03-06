'use strict';

if (self.importScripts) {
  self.importScripts('../resources/rs-utils.js');
  self.importScripts('/resources/testharness.js');
}

var ReadableStreamReader;

test(function() {
    // It's not exposed globally, but we test a few of its properties here.
    ReadableStreamReader = (new ReadableStream()).getReader().constructor;
}, 'Can get the ReadableStreamReader constructor indirectly');

test(function() {
    assert_throws(new TypeError(), function() {
        new ReadableStreamReader('potato');
    });
    assert_throws(new TypeError(), function() {
        new ReadableStreamReader({});
    });
    assert_throws(new TypeError(), function() {
        new ReadableStreamReader();
    });
}, 'ReadableStreamReader constructor should get a ReadableStream object as argument');

test(function() {
    var methods = ['cancel', 'constructor', 'read', 'releaseLock'];
    var properties = methods.concat(['closed']).sort();

    var rsReader = new ReadableStreamReader(new ReadableStream());
    var proto = Object.getPrototypeOf(rsReader);

    assert_array_equals(Object.getOwnPropertyNames(proto).sort(), properties);

    for (var m of methods) {
        var propDesc = Object.getOwnPropertyDescriptor(proto, m);
        assert_equals(propDesc.enumerable, false, 'method should be non-enumerable');
        assert_equals(propDesc.configurable, true, 'method should be configurable');
        assert_equals(propDesc.writable, true, 'method should be writable');
        assert_equals(typeof rsReader[m], 'function', 'should have be a method');
    }

    var closedPropDesc = Object.getOwnPropertyDescriptor(proto, 'closed');
    assert_equals(closedPropDesc.enumerable, false, 'closed should be non-enumerable');
    assert_equals(closedPropDesc.configurable, true, 'closed should be configurable');
    assert_not_equals(closedPropDesc.get, undefined, 'closed should have a getter');
    assert_equals(closedPropDesc.set, undefined, 'closed should not have a setter');

    assert_equals(rsReader.cancel.length, 1, 'cancel has 1 parameter');
    assert_not_equals(rsReader.closed, undefined, 'has a non-undefined closed property');
    assert_equals(typeof rsReader.closed.then, 'function', 'closed property is thenable');
    assert_equals(typeof rsReader.constructor, 'function', 'has a constructor method');
    assert_equals(rsReader.constructor.length, 1, 'constructor has 1 parameter');
    assert_equals(typeof rsReader.read, 'function', 'has a getReader method');
    assert_equals(rsReader.read.length, 0, 'read has no parameters');
    assert_equals(typeof rsReader.releaseLock, 'function', 'has a releaseLock method');
    assert_equals(rsReader.releaseLock.length, 0, 'releaseLock has no parameters');
}, 'ReadableStreamReader instances should have the correct list of properties');

test(function() {
    var rsReader = new ReadableStreamReader(new ReadableStream());

    assert_equals(rsReader.closed, rsReader.closed, 'closed should return the same promise');
}, 'ReadableStreamReader closed should always return the same promise object');

test(function() {
    var rs = new ReadableStream();
    new ReadableStreamReader(rs); // Constructing directly the first time should be fine.
    assert_throws(new TypeError(), function() { new ReadableStreamReader(rs); }, 'constructing directly the second time should fail');
}, 'Constructing a ReadableStreamReader directly should fail if the stream is already locked (via direct construction)');

test(function() {
    var rs = new ReadableStream();
    new ReadableStreamReader(rs); // Constructing directly should be fine.
    assert_throws(new TypeError(), function() { rs.getReader(); }, 'getReader() should fail');
}, 'Getting a ReadableStreamReader via getReader should fail if the stream is already locked (via direct construction)');

test(function() {
    var rs = new ReadableStream();
    rs.getReader(); // getReader() should be fine.
    assert_throws(new TypeError(), function() { new ReadableStreamReader(rs); }, 'constructing directly should fail');
}, 'Constructing a ReadableStreamReader directly should fail if the stream is already locked (via getReader)');

test(function() {
    var rs = new ReadableStream();
    rs.getReader(); // getReader() should be fine.
    assert_throws(new TypeError(), function() { rs.getReader(); }, 'getReader() should fail');
}, 'Getting a ReadableStreamReader via getReader should fail if the stream is already locked (via getReader)');

test(function() {
    var rs = new ReadableStream({
        start: function(c) {
            c.close();
        }
    });

    new ReadableStreamReader(rs); // Constructing directly should not throw.
}, 'Constructing a ReadableStreamReader directly should be OK if the stream is closed');

test(function() {
    var theError = new Error('don\'t say i didn\'t warn ya');
    var rs = new ReadableStream({
        start: function(c) {
            c.error(theError);
        }
    });

    new ReadableStreamReader(rs); // Constructing directly should not throw.
}, 'Constructing a ReadableStreamReader directly should be OK if the stream is errored');

var test1 = async_test('Reading from a reader for an empty stream will wait until a chunk is available');
test1.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });
    var reader = rs.getReader();

    reader.read().then(test1.step_func(function(result) {
        assert_object_equals(result, { value: 'a', done: false }, 'read() should fulfill with the enqueued chunk');
        test1.done();
    }));

    controller.enqueue('a');
});

var test2 = async_test('cancel() on a reader does not release the reader');
test2.step(function() {
    var cancelCalled = false;
    var passedReason = new Error('it wasn\'t the right time, sorry');
    var rs = new ReadableStream({
        cancel: function(reason) {
            assert_true(rs.locked, 'the stream should still be locked');
            assert_throws(new TypeError(), function() { rs.getReader(); }, 'should not be able to get another reader');
            assert_equals(reason, passedReason, 'the cancellation reason is passed through to the underlying source');
            cancelCalled = true;
        }
    });

    var reader = rs.getReader();
    reader.cancel(passedReason).then(
        test2.step_func(function() {
            assert_true(cancelCalled);
            test2.done('reader.cancel() should fulfill');
        }),
        test2.step_func(function(e) { assert_unreached('reader.cancel() should not reject'); })
    );
});

var test3 = async_test('closed should be fulfilled after stream is closed (.closed access before acquiring)');
test3.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var reader = rs.getReader();
    reader.closed.then(test3.step_func(function() {
        test3.done('reader closed should be fulfilled');
    }));

    controller.close();
});

var test4 = async_test('closed should be rejected after reader releases its lock (multiple stream locks)');
test4.step(function() {
    var promiseCalls = 0;
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var reader1 = rs.getReader();

    reader1.releaseLock();

    var reader2 = rs.getReader();
    controller.close();

    reader1.closed.catch(test4.step_func(function(e) {
        assert_throws(new TypeError(), function() { throw e; }, 'reader1 closed should be rejected with a TypeError');
        assert_equals(++promiseCalls, 1);
    }));

    reader2.closed.then(test4.step_func(function() {
        assert_equals(++promiseCalls, 2);
        test4.done('reader2 closed should be fulfilled');
    }));
});

var test5 = async_test('Multiple readers can access the stream in sequence');
test5.step(function() {
    var readCount = 0;
    var rs = new ReadableStream({
        start: function(c) {
            c.enqueue('a');
            c.enqueue('b');
            c.close();
        }
    });

    var reader1 = rs.getReader();
    reader1.read().then(test5.step_func(function(r) {
        assert_object_equals(r, { value: 'a', done: false }, 'reading the first chunk from reader1 works');
        ++readCount;
    }));
    reader1.releaseLock();

    var reader2 = rs.getReader();
    reader2.read().then(test5.step_func(function(r) {
        assert_object_equals(r, { value: 'b', done: false }, 'reading the second chunk from reader2 works');
        assert_equals(++readCount, 2);
        test5.done();
    }));
    reader2.releaseLock();
});

var test6 = async_test('Cannot use an already-released reader to unlock a stream again');
test6.step(function() {
    var rs = new ReadableStream({
        start: function(c) {
            c.enqueue('a');
        }
    });

    var reader1 = rs.getReader();
    reader1.releaseLock();

    var reader2 = rs.getReader();

    reader1.releaseLock();
    reader2.read().then(test6.step_func(function(result) {
        assert_object_equals(result, { value: 'a', done: false }, 'read() should still work on reader2 even after reader1 is released');
        test6.done();
    }));
});

var test7 = async_test('cancel() on a released reader is a no-op and does not pass through');
test7.step(function() {
    var promiseCalls = 0;
    var rs = new ReadableStream({
        start: function(c) {
            c.enqueue('a');
        },
        cancel: function() {
            assert_unreached('underlying source cancel should not be called');
        }
    });

    var reader = rs.getReader();
    reader.releaseLock();
    reader.cancel().then(test7.step_func(function(v) {
        assert_unreached('cancel promise should not fulfill');
    })).catch(test7.step_func(function(e) {
        assert_equals(++promiseCalls, 2);
        test7.done();
    }));

    var reader2 = rs.getReader();
    reader2.read().then(test7.step_func(function(r) {
        assert_object_equals(r, { value: 'a', done: false }, 'a new reader should be able to read a chunk');
        assert_equals(++promiseCalls, 1);
    }));
});

var test8 = async_test('Getting a second reader after erroring the stream should succeed');
test8.step(function() {
    var controller;
    var receivedErrors = 0;
    var theError = new Error('bad');
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var reader1 = rs.getReader();

    reader1.closed.catch(test8.step_func(function(e) {
        assert_equals(e, theError, 'the first reader closed getter should be rejected with the error');
        ++receivedErrors;
    }));

    reader1.read().catch(test8.step_func(function(e) {
        assert_equals(e, theError, 'the first reader read() should be rejected with the error');
        ++receivedErrors;
    }));

    assert_throws(new TypeError(), function() { rs.getReader(); }, 'trying to get another reader before erroring should throw');

    controller.error(theError);

    reader1.releaseLock();

    var reader2 = rs.getReader();

    reader2.closed.catch(test8.step_func(function(e) {
        assert_equals(e, theError, 'the second reader closed getter should be rejected with the error');
        ++receivedErrors;
    }));

    reader2.read().catch(test8.step_func(function(e) {
        assert_equals(e, theError, 'the third reader read() should be rejected with the error');
        assert_equals(++receivedErrors, 4);
        test8.done();
    }));
});

var test9 = async_test('ReadableStreamReader closed promise should be rejected with undefined if that is the error');
test9.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    rs.getReader().closed.then(test9.step_func(function() {
        assert_unreached("closed promise should not be resolved when stream is errored");
    }), test9.step_func(function(err) {
        assert_equals(err, undefined, 'passed error should be undefined as it was');
        test9.done();
    }));

    controller.error();
});

var test10 = async_test('Erroring a ReadableStream after checking closed should reject ReadableStreamReader closed promise');
test10.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

   rs.getReader().closed.then(test10.step_func(function() {
        assert_unreached("closed promise should not be resolved when stream is errored");
    }), test10.step_func(function(err) {
        assert_equals(rsError, err);
        test10.done();
    }));

    var rsError = "my error";
    controller.error(rsError);
});

var test11 = async_test('Erroring a ReadableStream before checking closed should reject ReadableStreamReader closed promise');
test11.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var rsError = "my error";
    controller.error(rsError);

    // Let's call getReader twice to ensure that stream is not locked to a reader.
    rs.getReader().releaseLock();
    rs.getReader().closed.then(test11.step_func(function() {
        assert_unreached("closed promise should not be resolved when stream is errored");
    }), test11.step_func(function(err) {
        assert_equals(rsError, err);
        test11.done();
    }));
});

var test12 = async_test('Reading twice on a stream that gets closed');
test12.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });
    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test12.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(++counter, 1);
    }));
    reader.read().then(test12.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(++counter, 2);
    }));
    reader.closed.then(test12.step_func(function() {
        assert_equals(++counter, 3);
        test12.done();
    }));

    controller.close();
});

var test13 = async_test('Reading twice on a closed stream');
test13.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    controller.close();

    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test13.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(counter, 0);
        counter++;
    }));
    reader.read().then(test13.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(counter, 1);
        counter++;
    }));
    reader.closed.then(test13.step_func(function() {
        assert_equals(counter, 2);
        counter++;
        test13.done();
    }));
});

var test14 = async_test('Reading twice on an errored stream');
test14.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var myError = { potato: "mashed" };
    controller.error(myError);

    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test14.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test14.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 0);
        counter++;
    }));
    reader.read().then(test14.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test14.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 1);
        counter++;
    }));
    reader.closed.then(test14.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test14.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 2);
        counter++;
        test14.done();
    }));
});

var test15 = async_test('Reading twice on a stream that gets errored');
test15.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test15.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test15.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 1);
    }));
    reader.read().then(test15.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test15.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 2);
    }));
    reader.closed.then(test15.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test15.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 3);
        test15.done();
    }));

    var myError = { potato: 'mashed' };
    controller.error(myError);
 });

var test16 = async_test('ReadableStream: if start rejects with no parameter, it should error the stream with an undefined error');
test16.step(function() {
    var rs = new ReadableStream({
        start: function(c) {
            return Promise.reject();
        }
    });

    rs.getReader().read().catch(test16.step_func(function(e) {
        assert_equals(typeof e, "undefined");
        test16.done();
    }));
});

done();
