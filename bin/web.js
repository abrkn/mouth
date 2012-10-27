var express = require('express');

var server = require('../lib/server/App.js')();
server.listen(process.env.PORT || 4010);