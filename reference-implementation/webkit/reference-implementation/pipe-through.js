require('../resources/testharness');

require('./utils/streams-utils');

// This is updated till https://github.com/whatwg/streams/commit/c942e11025a770d60ab3d4f6541b29e45da518da

var test1 = async_test('Piping through a duck-typed pass-through transform stream works');
test1.step(function() {
    var readableEnd = sequentialReadableStream(5).pipeThrough(duckTypedPassThroughTransform());

    readableStreamToArray(readableEnd).then(function(chunks) {
        assert_array_equals(chunks, [1, 2, 3, 4, 5]);
        test1.done();
    }).catch(function(e) { assert_unreached(e); });
});

var test2 = async_test('Piping through an identity transform stream will close the destination when the source closes');
test2.step(function() {
    var rs = new ReadableStream({
        start: function(c) {
            c.enqueue('a');
            c.enqueue('b');
            c.enqueue('c');
            c.close();
        }
    });

    var ts = new TransformStream({
        transform: function(chunk, enqueue, done) {
            enqueue(chunk);
            done();
        }
    });

    var ws = new WritableStream();

    rs.pipeThrough(ts).pipeTo(ws).then(function() {
        assert_equals(ws.state, 'closed', 'the writable stream was closed');
        test2.done();
    }).catch(function(e) { assert_unreached(e); });
});
