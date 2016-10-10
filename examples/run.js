#!/usr/bin/env node

'use strict';

const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const [node, script, example] = process.argv;
const examplePath = path.join(__dirname, example);
try {
	const stats = fs.statSync(examplePath);
	if (!stats.isDirectory()) {
		throw new Error();
	}
} catch (error) {
	console.error(`${examplePath} must be a directory!`);
	process.exit(1);
}

const app = express();

app.use(express.static(example));

const server = http.createServer(app);
server.listen(process.env.PORT || 8000, process.env.HOSTNAME || 'localhost', () => {
	const address = server.address();
	const link = url.format({
		protocol: 'http',
		hostname: address.address,
		port: address.port,
		pathname: '/'
	});
	console.log(`Listening on ${link}.`);
	console.log('Press Ctrl+C to exit.');
});
