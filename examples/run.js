#!/usr/bin/env node

'use strict';

var express = require('express');
var fs = require('fs');
var http = require('http');
var httpProxy = require('http-proxy');
var path = require('path');
var url = require('url');

var example = process.argv[2];
var examplePath = path.join(__dirname, example);
try {
	var stats = fs.statSync(examplePath);
	if (!stats.isDirectory()) {
		throw new Error();
	}
} catch (error) {
	console.error(examplePath + ' must be a directory!');
	process.exit(1);
}

var app = express();
var server = http.createServer(app);
var proxy = httpProxy.createProxyServer({
	target: process.env.HORIZON || 'http://162.243.22.35/',
	ws: true
});

app.use(express.static(example));

app.use(function (request, response) {
	return proxy.web(request, response);
});

server.on('upgrade', function (request, socket, head) {
	return proxy.ws(request, socket, head);
});

server.listen(
	process.env.PORT || 8000,
	process.env.HOSTNAME || 'localhost',
	function () {
		var address = server.address();
		var link = url.format({
			protocol: 'http',
			hostname: address.address,
			port: address.port,
			pathname: '/'
		});
		console.log('Listening on ' + link);
		console.log('Press Ctrl+C to exit.');
	}
);
