require('../resources/testharness');

require('./utils/streams-utils');

test(function() {
    var strategy = new ByteLengthQueuingStrategy({ highWaterMark: 4 });
}, 'Can construct a ByteLengthQueuingStrategy with a valid high water mark');

test(function() {
    for (var highWaterMark of [-Infinity, NaN, 'foo', {}, function () {}]) {
        var strategy = new ByteLengthQueuingStrategy({ highWaterMark });
        assert_true(Object.is(strategy.highWaterMark, highWaterMark), highWaterMark + ' gets set correctly');
    }
}, 'Can construct a ByteLengthQueuingStrategy with any value as its high water mark');

test(function() {
    var strategy = new ByteLengthQueuingStrategy({ highWaterMark: 4 });

    assert_object_equals(Object.getOwnPropertyDescriptor(strategy, 'highWaterMark'),
                         { value: 4, writable: true, enumerable: true, configurable: true },
                         'highWaterMark property should be a data property with the value passed the connstructor');
    assert_equals(typeof strategy.size, 'function');
}, 'ByteLengthQueuingStrategy instances have the correct properties');