require('./resources/testharness');

require('./reference-implementation/utils/streams-utils');

test(function() {
    assert_throws(new TypeError(), function() {
        new ReadableStream(null);
    }, 'constructor should throw when the source is null');
}, 'ReadableStream can\'t be constructed with garbage');

test(function()
{
    var isStartCalled = false;
    var source = {
        start: function(controller) {
            assert_equals(this, source, 'source is this during start');

            var unnamedMethods = [ 'close', 'enqueue', 'error' ];
            var methods = unnamedMethods.concat(['constructor']).sort();
            var proto = Object.getPrototypeOf(controller);

            assert_array_equals(Object.getOwnPropertyNames(Object.getPrototypeOf(controller)).sort(), methods,
                        'the controller should have the right methods');

            for (var m of unnamedMethods) {
                assert_equals(controller[m].name, '', 'method should have no name');
            }

            for (var m of methods) {
                var methodProperties = [ 'arguments', 'caller', 'length', 'name', 'prototype' ];
                var propDesc = Object.getOwnPropertyDescriptor(proto, m);
                assert_equals(propDesc.enumerable, false, 'method should be non-enumerable');
                assert_equals(propDesc.configurable, true, 'method should be configurable');
                assert_equals(propDesc.writable, true, 'method should be writable');
                assert_equals(typeof controller[m], 'function', 'should have be a method');
                assert_array_equals(Object.getOwnPropertyNames(controller[m]).sort(), methodProperties, 'method should have the right properties');
            }

            assert_equals(controller.close.length, 0, 'close should have no parameters');
            assert_equals(controller.constructor.length, 1, 'constructor should have 1 parameters');
            assert_equals(controller.enqueue.length, 1, 'enqueue should have 1 parameter');
            assert_equals(controller.error.length, 1, 'error should have 1 parameter');

            isStartCalled = true;
        }
    };

    var rs = new ReadableStream(source);
    assert_true(isStartCalled);
}, 'ReadableStream start should be called with the proper parameters');

test(function()
{
    var isStartCalled = false;
    var source = {
        start: function(controller) {
      const methods = [ 'close', 'constructor', 'enqueue', 'error' ];
            assert_array_equals(Object.getOwnPropertyNames(Object.getPrototypeOf(controller)).sort(), methods, 'prototype should have the right methods');
            controller.test = "";
            assert_array_equals(Object.getOwnPropertyNames(Object.getPrototypeOf(controller)).sort(), methods, 'prototype should still have the right methods');
            assert_not_equals(Object.getOwnPropertyNames(controller).indexOf('test'), '\'test\' is a property of the controller');

            isStartCalled = true;
        }
    };

    var rs = new ReadableStream(source);
    assert_true(isStartCalled);
}, 'ReadableStream start controller parameter should be updatable');

test(function()
{
    var isStartCalled = false;

    var SimpleStreamSource = function() { };
    SimpleStreamSource.prototype.start = function() { isStartCalled = true; };
    SimpleStreamSource.prototype.constructor = SimpleStreamSource;

    var rs = new ReadableStream(new SimpleStreamSource());
    assert_true(isStartCalled);
}, 'ReadableStream should be able to call start method within prototype chain of its source');