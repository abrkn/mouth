var io = require('socket.io')
, _ = require('underscore');

module.exports = {
	configure: function(server) {
		var ioConfig = { log: false };

		if (process.env.PORT) {
			_.extend(ioConfig, {
				'transports': process.env.PORT ? ['xhr-polling'] : undefined,
				'polling duration': 10
			});
		}

		return io.listen(server, ioConfig);
	}
};