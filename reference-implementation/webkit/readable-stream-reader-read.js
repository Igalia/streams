require('./resources/testharness');

require('./reference-implementation/utils/streams-utils');

var test1 = async_test('Reading twice on a stream that gets closed');
test1.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });
    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test1.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(++counter, 1);
    }));
    reader.read().then(test1.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(++counter, 2);
    }));
    reader.closed.then(test1.step_func(function() {
        assert_equals(++counter, 3);
        test1.done();
    }));

    controller.close();
});

var test2 = async_test('Reading twice on a closed stream');
test2.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    controller.close();

    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test2.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(counter, 0);
        counter++;
    }));
    reader.read().then(test2.step_func(function(result) {
        assert_object_equals(result, { value: undefined, done: true }, 'read() should fulfill with close');
        assert_equals(counter, 1);
        counter++;
    }));
    reader.closed.then(test2.step_func(function() {
        assert_equals(counter, 2);
        counter++;
        test2.done();
    }));
});

var test3 = async_test('Reading twice on an errored stream');
test3.step(function() {
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

    reader.read().then(test3.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test3.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 0);
        counter++;
    }));
    reader.read().then(test3.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test3.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 1);
        counter++;
    }));
    reader.closed.then(test3.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test3.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(counter, 2);
        counter++;
        test3.done();
    }));
});

var test4 = async_test('Reading twice on a stream that gets errored');
test4.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var counter = 0;
    var reader = rs.getReader();

    reader.read().then(test4.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test4.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 1);
    }));
    reader.read().then(test4.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test4.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 2);
        test4.done();
    }));
    reader.closed.then(test4.step_func(function() {
        assert_unreached('read() should reject on an errored stream');
    }), test4.step_func(function(err) {
        assert_equals(myError, err);
        assert_equals(++counter, 3);
        test4.done();
    }));

    var myError = { potato: 'mashed' };
    controller.error(myError);
 });

var test5 = async_test('Reading within a read promise resolve callback on a stream that gets closed');
test5.step(function() {
    var controller;
    var rs = new ReadableStream({
        start: function(c) {
            controller = c;
        }
    });

    var reader = rs.getReader();

    reader.read().then(test5.step_func(function() {
        reader.read().then(test5.step_func(function() {
            test5.done();
        }));
    }));
    controller.close();
});
