#!/usr/bin/env node

'use strict';

const r = require('rethinkdb');

const host = process.env.RETHINKDB_HOST || 'localhost';
const port = typeof process.env.RETHINKDB_PORT !== 'undefined'
	? parseInt(process.env.RETHINKDB_PORT, 10)
	: 28015;
const [node, script, password] = process.argv;

r.connect({
	host,
	port,
	user: 'admin',
	password: ''
}).then((connection) =>
	r.db('rethinkdb')
	.table('users')
	.filter({ id: 'admin' })
	.update({ password })
	.run(connection)
	.then(() => connection.close())
, (error) => {
	console.log('Admin password was already changed.');
	process.exit(0);
}).catch((error) => {
	console.error('Error changing admin password', error);
	process.exit(1);
});
