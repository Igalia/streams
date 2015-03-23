require('../resources/testharness');

require('./utils/streams-utils');

var test1 = async_test('ReadableStream cancellation: integration test on an infinite stream derived from a random push source');
test1.step(function() {
    const randomSource = new RandomPushSource();

    var cancellationFinished = false;
    const rs = new ReadableStream({
        start: function(enqueue, close, error) {
            randomSource.ondata = enqueue;
            randomSource.onend = close;
            randomSource.onerror = error;
        },

        pull: function() {
            randomSource.readStart();
        },

        cancel: function() {
            randomSource.readStop();
            randomSource.onend();

            return new Promise(test1.step_func(function(resolve) {
                setTimeout(test1.step_func(function() {
                    cancellationFinished = true;
                    resolve();
                }), 50)
            }));
        }
    });
    const reader = rs.getReader();

    readableStreamToArray(rs, reader).then(test1.step_func(function(chunks) {
        assert_equals(cancellationFinished, false, 'it did not wait for the cancellation process to finish before closing');
        assert_greater_than(chunks.length, 0, 'at least one chunk should be read');
        for (var i = 0; i < chunks.length; i++) {
            assert_equals(chunks[i].length, 128, `chunk ${i + 1} should have 128 bytes`);
        }
    }), test1.step_func(function(e) { assert_unreached(e); }));

    setTimeout(test1.step_func(function() {
        reader.cancel().then(test1.step_func(function() {
            assert_equals(cancellationFinished, true, 'it returns a promise that is fulfilled when the cancellation finishes');
            test1.done();
        })).catch(test1.step_func(function(e) { assert_unreached(e); }));
    }), 150);
});

test(function() {
    var recordedReason;
    const rs = new ReadableStream({
        cancel: function(reason) {
            recordedReason = reason;
        }
    });

    const passedReason = new Error('Sorry, it just wasn\'t meant to be.');
    rs.cancel(passedReason);

    assert_equals(recordedReason, passedReason,
                  'the error passed to the underlying source\'s cancel method should equal the one passed to the stream\'s cancel');
}, 'ReadableStream cancellation: cancel(reason) should pass through the given reason to the underlying source');

var test2 = async_test('ReadableStream cancellation: cancel() on a locked stream should fail and not call the underlying source cancel');
test2.step(function() {
    const rs = new ReadableStream({
        start: function(enqueue, close) {
            enqueue('a');
            close();
        },
        cancel: function() {
            assert_unreached('underlying source cancel() should not have been called');
        }
    });

    const reader = rs.getReader();

    rs.cancel().catch(test2.step_func(function(e) {
        assert_throws(new TypeError(), e, 'cancel() should be rejected with a TypeError')
    }));

    reader.read().then(test2.step_func(function(result) {
        assert_object_equals(result, { value: 'a', done: false }, 'read() should still work after the attempted cancel');
    }));

    reader.closed.then(test2.step_func(function() {
        test2.done('closed should fulfill without underlying source cancel ever being called');
    }));
});

var test3 = async_test('ReadableStream cancellation: returning a value from the underlying source\'s cancel should not affect the fulfillment value of the promise returned by the stream\'s cancel');
test3.step(function() {
    const rs = new ReadableStream({
        cancel: function(reason) {
            return 'Hello';
        }
    });

    rs.cancel().then(test3.step_func(function(v) {
        assert_equals(v, undefined, 'cancel() return value should be fulfilled with undefined');
        test3.done();
    }), test3.step_func(function() {
        assert_unreached('cancel() return value should not be rejected');
    }));
});

var test4 = async_test('ReadableStream cancellation: if the underlying source\'s cancel method returns a promise, the promise returned by the stream\'s cancel should fulfill when that one does');
test4.step(function() {
    var resolveSourceCancelPromise;
    var sourceCancelPromiseHasFulfilled = false;
    const rs = new ReadableStream({
        cancel: function() {
            const sourceCancelPromise = new Promise(test4.step_func(function(resolve, reject) {
                resolveSourceCancelPromise = resolve;
            }));

            sourceCancelPromise.then(test4.step_func(function() {
                sourceCancelPromiseHasFulfilled = true;
            }));

            return sourceCancelPromise;
        }
    });

    rs.cancel().then(test4.step_func(function(value) {
        assert_equals(sourceCancelPromiseHasFulfilled, true, 'cancel() return value should be fulfilled only after the promise returned by the underlying source\'s cancel');
        assert_equals(value, undefined, 'cancel() return value should be fulfilled with undefined');
        test4.done();
    }), test4.step_func(function() { assert_unreached('cancel() return value should not be rejected'); } ));

    setTimeout(test4.step_func(function() {
        resolveSourceCancelPromise('Hello');
    }), 30);
});

var test5 = async_test('ReadableStream cancellation: if the underlying source\'s cancel method returns a promise, the promise returned by the stream\'s cancel should reject when that one does');
test5.step(function() {
    var rejectSourceCancelPromise;
    var sourceCancelPromiseHasRejected = false;
    const rs = new ReadableStream({
        cancel: function() {
            const sourceCancelPromise = new Promise(test5.step_func(function(resolve, reject) {
                rejectSourceCancelPromise = reject;
            }));

            sourceCancelPromise.catch(test5.step_func(function() {
                sourceCancelPromiseHasRejected = true;
            }));

            return sourceCancelPromise;
        }
    });

    const errorInCancel = new Error('Sorry, it just wasn\'t meant to be.');

    rs.cancel().then(
        test5.step_func(function() { assert_function('cancel() return value should not be rejected'); }),
        test5.step_func(function(r) {
            assert_equals(sourceCancelPromiseHasRejected, true, 'cancel() return value should be rejected only after the promise returned by the underlying source\'s cancel');
            assert_equals(r, errorInCancel, 'cancel() return value should be rejected with the underlying source\'s rejection reason');
            test5.done();
        }));

    setTimeout(test5.step_func(function() {
        rejectSourceCancelPromise(errorInCancel);
    }), 30);
});

var test6 = async_test('ReadableStream cancellation: cancelling before start finishes should prevent pull() from being called');
test6.step(function() {
    const rs = new ReadableStream({
        pull: function() {
            assert_unreached('pull should not have been called');
        }
    });

    Promise.all([rs.cancel(), rs.getReader().closed]).then(test6.step_func(function() {
        test6.done('pull should never have been called');
    })).catch(test6.step_func(function(e) { assert_reached(e); } ));
});