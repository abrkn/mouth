var Backbone = require('backbone');

module.exports = function() {
    var busy = false
    , queue = []
    , callback = function() {
        if (queue.length) return queue.shift()(callback);
        busy = false;
        enqueue.drain && enqueue.drain();
    }
    , enqueue = function(fn) {
        if (busy) return queue.push(fn);
        busy = true;
        fn(callback);
    };
    return enqueue;
};