require('../resources/testharness');

require('./utils/streams-utils');

test(function() {
    const theError = new Error('a unique string');

    assert_throws(theError, function() {
        new ReadableStream({
            get start() {
                throw theError;
            }
        });
    }, 'constructing the stream should re-throw the error');
}, 'Underlying source start: throwing getter');

test(function() {
    const theError = new Error('a unique string');

    assert_throws(theError, function() {
        new ReadableStream({
            start: function() {
                throw theError;
            }
        });
    }, 'constructing the stream should re-throw the error');
}, 'Underlying source start: throwing method');

var test1 = async_test('Underlying source: throwing pull getter (initial pull)');
test1.step(function() {
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        get pull() {
            throw theError;
        }
    });

    rs.getReader().closed.then(
        test1.step_func(function() { assert_unreached('closed should not fulfill'); }),
        test1.step_func(function(r) {
            assert_equals(r, theError, 'closed should reject with the thrown error');
            test1.done();
        }));
});

var test2 = async_test('Underlying source: throwing pull method (initial pull)');
test2.step(function() {
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        pull: function() {
            throw theError;
        }
    });

    rs.getReader().closed.then(
        test2.step_func(function() { assert_unreached('closed should not fulfill'); }),
        test2.step_func(function(r) {
            assert_equals(r, theError, 'closed should reject with the thrown error');
            test2.done();
        }));
});

var test3 = async_test('Underlying source: throwing pull getter (second pull)');
test3.step(function() {
    const theError = new Error('a unique string');
    var counter = 0;
    const rs = new ReadableStream({
        get pull() {
            ++counter;
            if (counter === 1) {
                return enqueue => enqueue('a');
            }

            throw theError;
        }
    });
    const reader = rs.getReader();

    reader.read().then(test3.step_func(function(r) {
        assert_object_equals(r, { value: 'a', done: false }, 'the chunk read should be correct');
    }));

    reader.closed.then(
        test3.step_func(function() { assert_unreached('closed should not fulfill'); }),
        test3.step_func(function(r) {
            assert_equals(r, theError, 'closed should reject with the thrown error');
            test3.done();
        }));
});

var test4 = async_test('Underlying source: throwing pull method (second pull)');
test4.step(function() {
    const theError = new Error('a unique string');
    var counter = 0;
    const rs = new ReadableStream({
        pull: function(enqueue) {
            ++counter;
            if (counter === 1) {
                enqueue('a');
            } else {
                throw theError;
            }
        }
    });
    const reader = rs.getReader();

    reader.read().then(test4.step_func(function(r) { assert_object_equals(r, { value: 'a', done: false }, 'the chunk read should be correct'); }));

    reader.closed.then(
        test4.step_func(function() { assert_unreached('closed should not fulfill'); }),
        test4.step_func(function(r) {
            assert_equals(r, theError, 'closed should reject with the thrown error');
            test4.done();
        }));
});

var test5 = async_test('Underlying source: throwing cancel getter');
test5.step(function() {
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        get cancel() {
            throw theError;
        }
    });

    rs.cancel().then(
        test5.step_func(function() { assert_unreached('cancel should not fulfill'); }),
        test5.step_func(function(r) {
            assert_equals(r, theError, 'cancel should reject with the thrown error');
            test5.done();
        }));
});

var test6 = async_test('Underlying source: throwing cancel method');
test6.step(function() {
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        cancel: function() {
            throw theError;
        }
    });

    rs.cancel().then(
        test6.step_func(function() { assert_unreached('cancel should not fulfill'); }),
        test6.step_func(function(r) {
            assert_equals(r, theError, 'cancel should reject with the thrown error');
            test6.done();
        }));
});

var test7 = async_test('Underlying source: throwing strategy getter');
test7.step(function() {
    var started = false;
    const theError = new Error('a unique string');

    const rs = new ReadableStream({
        start: function(enqueue) {
            started = true;
            assert_throws(theError, function() { enqueue('a'); }, 'enqueue should throw the error');
        },
        get strategy() {
            throw theError;
        }
    });

    rs.getReader().closed.catch(test7.step_func(function(e) {
        assert_true(started);
        assert_equals(e, theError, 'closed should reject with the error');
        test7.done();
    }));
});

var test8 = async_test('Underlying source: throwing strategy.size getter');
test8.step(function() {
    var started = false;
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        start: function(enqueue) {
            started = true;
            assert_throws(theError, function() { enqueue('a'); }, 'enqueue should throw the error');
        },
        strategy: {
            get size() {
                throw theError;
            },
            shouldApplyBackpressure: function() {
                return true;
            }
        }
    });

    rs.getReader().closed.catch(test8.step_func(function(e) {
        assert_true(started);
        assert_equals(e, theError, 'closed should reject with the error');
        test8.done();
    }));
});

var test9 = async_test('Underlying source: throwing strategy.size method');
test9.step(function() {
    var started = false;
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        start: function(enqueue) {
            started = true;
            assert_throws(theError, function() { enqueue('a'); }, 'enqueue should throw the error');
        },
        strategy: {
            size: function() {
                throw theError;
            },
            shouldApplyBackpressure: function() {
                return true;
            }
        }
    });

    rs.getReader().closed.catch(test9.step_func(function(e) {
        assert_true(started);
        assert_equals(e, theError, 'closed should reject with the error');
        test9.done();
    }));
});

var test10 = async_test('Underlying source: throwing strategy.shouldApplyBackpressure getter');
test10.step(function() {
    var started = false;
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        start: function(enqueue) {
            started = true;
            assert_throws(theError, function() { enqueue('a'); }, 'enqueue should throw the error');
        },
        strategy: {
            size: function() {
                return 1;
            },
            get shouldApplyBackpressure() {
                throw theError;
            }
        }
    });

    rs.getReader().closed.catch(test10.step_func(function(e) {
        assert_true(started);
        assert_equals(e, theError, 'closed should reject with the error');
        test10.done();
    }));
});

var test11 = async_test('Underlying source: throwing strategy.shouldApplyBackpressure method');
test11.step(function() {
    var started = false;
    const theError = new Error('a unique string');
    const rs = new ReadableStream({
        start: function(enqueue) {
            started = true;
            assert_throws(theError, function() { enqueue('a'); }, 'enqueue should throw the error');
        },
        strategy: {
            size: function() {
                return 1;
            },
            shouldApplyBackpressure: function() {
                throw theError;
            }
        }
    });

    rs.getReader().closed.catch(test11.step_func(function(e) {
        assert_true(started);
        assert_equals(e, theError, 'closed should reject with the error');
        test11.done();
    }));
});

var test12 = async_test('Underlying source: strategy.size returning NaN');
test12.step(function() {
    var theError = undefined;
    const rs = new ReadableStream({
        start: function(enqueue) {
            try {
                enqueue('hi');
                assert_unreached('enqueue didn\'t throw');
            } catch (error) {
                theError = error;
                assert_throws(new RangeError(), function() { throw error; }, 'enqueue should throw a RangeError');
            }
        },
        strategy: {
            size: function() {
                return NaN;
            },
            shouldApplyBackpressure: function() {
                return true;
            }
        }
    });

    rs.getReader().closed.catch(test12.step_func(function(e) {
        assert_equals(e, theError, 'closed should reject with the error');
        test12.done();
    }));
});

var test13 = async_test('Underlying source: strategy.size returning -Infinity');
test13.step(function() {
    var theError = undefined;
    const rs = new ReadableStream({
        start: function(enqueue) {
            try {
                enqueue('hi');
                assert_unreached('enqueue didn\'t throw');
            } catch (error) {
                theError = error;
                assert_throws(new RangeError(), function() { throw error; }, 'enqueue should throw a RangeError');
            }
        },
        strategy: {
            size: function() {
                return -Infinity;
            },
            shouldApplyBackpressure: function() {
                return true;
            }
        }
    });

    rs.getReader().closed.catch(test13.step_func(function(e) {
        assert_equals(e, theError, 'closed should reject with the error');
        test13.done();
    }));
});

var test14 = async_test('Underlying source: strategy.size returning +Infinity');
test14.step(function() {
    var theError = undefined;
    const rs = new ReadableStream({
        start: function(enqueue) {
            try {
                enqueue('hi');
                assert_unreached('enqueue didn\'t throw');
            } catch (error) {
                theError = error;
                assert_throws(new RangeError(), function() { throw error; }, 'enqueue should throw a RangeError');
            }
        },
        strategy: {
            size: function() {
                return +Infinity;
            },
            shouldApplyBackpressure: function() {
                return true;
            }
        }
    });

    rs.getReader().closed.catch(test14.step_func(function(e) {
        assert_equals(e, theError, 'closed should reject with the error');
        test14.done();
    }));
});

var test15 = async_test('Underlying source: calling close twice on an empty stream should throw the second time');
test15.step(function() {
    new ReadableStream({
        start: function(enqueue, close) {
            close();
            assert_throws(new TypeError(), function() { close(); }, 'second call to close should throw a TypeError');
        }
    }).getReader().closed.then(test15.step_func(function() { test15.done('closed should fulfill'); }));
});

var test16 = async_test('Underlying source: calling close twice on a non-empty stream should throw the second time');
test16.step(function() {
    var startCalled = false;
    var readCalled = false;
    const reader = new ReadableStream({
        start: function(enqueue, close) {
            enqueue('a');
            close();
            assert_throws(new TypeError(), close, 'second call to close should throw a TypeError');
            startCalled = true;
        }
    }).getReader();

    reader.read().then(test16.step_func(function(r) {
        assert_object_equals(r, { value: 'a', done: false }, 'read() should read the enqueued chunk');
        readCalled = true;
    }));
    reader.closed.then(test16.step_func(function() {
        assert_true(startCalled);
        assert_true(readCalled);
        test16.done('closed should fulfill');
    }));
});

var test17 = async_test('Underlying source: calling close on an empty canceled stream should not throw');
test17.step(function() {
    var doClose;
    var startCalled = false;
    const rs = new ReadableStream({
        start: function(enqueue, close) {
            doClose = close;
            startCalled = true;
        }
    });

    rs.cancel();
    assert_does_not_throw(doClose, 'calling close after canceling should not throw anything');

    rs.getReader().closed.then(test17.step_func(function() {
        assert_true(startCalled);
        test17.done('closed should fulfill');
    }));
});

var test18 = async_test('Underlying source: calling close on a non-empty canceled stream should not throw');
test18.step(function() {
    var doClose;
    var startCalled = false;
    const rs = new ReadableStream({
        start: function(enqueue, close) {
            enqueue('a');
            doClose = close;
            startCalled = true;
        }
    });

    rs.cancel();
    assert_does_not_throw(doClose, 'calling close after canceling should not throw anything');

    rs.getReader().closed.then(test18.step_func(function() {
        assert_true(startCalled);
        test18.done('closed should fulfill');
    }));
});

var test19 = async_test('Underlying source: calling close after error should throw');
test19.step(function() {
    const theError = new Error('boo');
    var startCalled = false;
    new ReadableStream({
        start: function(enqueue, close, error) {
            error(theError);
            assert_throws(new TypeError(), close, 'call to close should throw a TypeError');
            startCalled = true;
        }
    }).getReader().closed.catch(test19.step_func(function(e) {
        assert_true(startCalled);
        assert_equals(e, theError, 'closed should reject with the error')
        test19.done();
    }));
});

var test20 = async_test('Underlying source: calling error twice should throw the second time');
test20.step(function() {
    const theError = new Error('boo');
    var startCalled = false;
    new ReadableStream({
        start: function(enqueue, close, error) {
            error(theError);
            assert_throws(new TypeError(), error, 'second call to error should throw a TypeError');
            startCalled = true;
        }
    }).getReader().closed.catch(test20.step_func(function(e) {
        assert_true(startCalled);
        assert_equals(e, theError, 'closed should reject with the error');
        test20.done();
    }));
});

var test21 = async_test('Underlying source: calling error after close should throw');
test21.step(function() {
    var startCalled = false;
    new ReadableStream({
        start: function(enqueue, close, error) {
            close();
            assert_throws(new TypeError(), error, 'call to error should throw a TypeError');
            startCalled = true;
        }
    }).getReader().closed.then(test21.step_func(function() {
        assert_true(startCalled);
        test21.done('closed should fulfill');
    }));
});
