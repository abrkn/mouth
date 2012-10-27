var express = require('express')
, app = express();

require('../test/support/phantom-app.js')(app);
app.listen(4011, '127.0.0.1');