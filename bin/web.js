var express = require('express')
, app = express();

require('../lib/server/App.js')(app);
app.listen(process.argv[1] || process.env.PORT || 4020);