const express = require('express');
const http = require('http');
const env = require('./env.js');
const index = require('./utils')
const proxy = require('./utils/proxyServer');
const path = require("path");
const cookieParser = require('cookie-parser');
const startup = require('./startup');
const {ApiError, FallThrough} = require("./utils/aexpress");
const sessions = require('./sessions');
const usersAdministration = require('./users-administration');
const usersWithoutSession = require('./users-without-session')
const users = require('./users');
const languages = require('./languages');
const courses = require('./courses');
const adventures = require('./adventures-administration')
const SQLBuilder = require('./utils/SQLBuilder');
const adventuresPublic = require('./adventures-public');
const statistics = require('./statistics')
const {startSocketServer} = require("./socket-actions");
const adventureNodePictures = require('./adventure-node-pictures');

startup.startUp();

const db = new SQLBuilder();
const app = express();
const server = http.createServer(app);

server.listen(env.port, env.host, () => console.log(`Listening on ${env.url}`));

app.use(proxy.app);

if (!env.useProxy) {
	startSocketServer(server);
}

app.use(cookieParser());
app.use(express.json());

app.use('/api', sessions.app);
app.use('/api', usersWithoutSession.app);
app.get_json('/api/languages/list', async req => await db.select('languages').getList());

/* ALL OTHER MODULES NEED SESSION */

app.all_json('/api/*', async req => {
	req.session = await sessions.getSessionUser(req.cookies[env.session_cookie_name]);

	if (!req.session.active) {
		throw new ApiError(401, 'Your account must be active')
	}

	return FallThrough;
});

app.use('/api', courses.app);
app.use('/api', users.app);
app.use('/api', adventuresPublic.app);
app.use('/api', statistics.app);

app.all_json('/api/*', async req => {
	if (req.session.role !== 'ADMIN' && req.session.role !== 'EDITOR') {
		throw new ApiError(401, 'Your role is too low to perform this operation');
	}

	return FallThrough;
});

app.use('/api', adventures.app);
app.use('/api', languages.app);

app.all_json('/api/*', async req => {
	if (req.session.role !== 'ADMIN') {
		throw new ApiError(401, 'Your role is too low to perform this operation');
	}

	return FallThrough;
})

app.use('/api', usersAdministration.app);
app.use('/api', adventureNodePictures.app);

/**
 * Static files must be served in main file
 */
const options = {
	lastModified: true,
	redirect: '/'
}

app.use(express.static(path.join(path.resolve(), 'gen/fe'), options))
app.use(express.static(path.join(path.resolve(), 'fe'), options));

/**
 * Index page must be last route/router, because it catches all remaining requests
 */
app.use('*', index.app);