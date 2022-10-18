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

startup.startUp();

const app = express();
const server = http.createServer(app);

server.listen(env.port, env.host, () => console.log(`Listening on ${env.url}`));

app.use(proxy.app);

app.use(cookieParser());
app.use(express.json());

app.use('/api', sessions.app);
app.use('/api', usersWithoutSession.app);

/* ALL OTHER MODULES NEED SESSION */

app.all_json('/api/*', async req => {
	req.session = await sessions.getSessionUser(req.cookies[env.session_cookie_name]);

	if (!req.session.active) {
		throw new ApiError(401, 'Your account must be active')
	}

	return FallThrough;
});

app.use('/api', users.app);

app.all_json('/api/*', async req => {
	if (req.session.role !== 'ADMIN') {
		throw new ApiError(401, 'Your role is too low to perform this operation');
	}

	return FallThrough;
})

app.use('/api', usersAdministration.app);
app.use('/api', languages.app);

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