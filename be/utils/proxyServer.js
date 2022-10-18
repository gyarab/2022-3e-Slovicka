const express = require('express');
const fs = require("fs");
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require("ws");
const env = require('../env.js');

const app = express();

if (env.useProxy) {
	app.use('/api/*', createProxyMiddleware({
		target: env.proxy_url,
		changeOrigin: true
	}));
}

if (env.reload_css_onsave) {
	const wss = new WebSocket.Server({
		port: env.websocket_port
	});

	wss.on('connection', function connection(ws) {
		ws.on('message', function message(data) {
			console.log('received: %s', data);
		});

		fs.watchFile('gen/fe/main.css', {interval: 500}, (curr, prev) => {
			ws.send('reload-css');
		});
	});
}

module.exports = {app};