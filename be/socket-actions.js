const SQLBuilder = require('./utils/SQLBuilder');
const { Server } = require("socket.io");
const env = require('./env');
const cookie = require('cookie');
const sessions = require('./sessions');
const {parseId} = require("./utils/utils");

const db = new SQLBuilder();
const USER_INTERACTIONS = {
	LOGIN: 'LOGIN'
}

async function writeDaystreak(userId) {
	const daystreakAlredyPassed = await db.select('user_interactions')
		.where('"user" = ?', userId)
		.where('event = ?', USER_INTERACTIONS.LOGIN)
		.oneOrNone();

	if (!daystreakAlredyPassed) {
		await db.insert('user_interactions', {
			event: USER_INTERACTIONS.LOGIN,
			"user": userId
		})
		.run();
	}
}

function startSocketServer(server) {
	const io = new Server(server);

	const connectedUsers = {};

	io.onX = (event, callback) => {
		io.on(event, async (socket) => {
			try {
				const sessionId = cookie.parse(socket.handshake.headers?.cookie || '')[env.session_cookie_name];
				socket.session = await sessions.getSessionUser(sessionId);
				await writeDaystreak(socket.session.id);
				await callback(socket);
			} catch (ex) {
				socket.emit('exception', {message: ex.message, status: ex.status});
				if (ex.status === 401) {
					socket.disconnect(true);
				}
			}
		})
	}

	io.onX('connection', (socket) => {
		socket.onX = (event, handler) => {
			socket.on(event, async (...args) => {
				try {
					await handler(...args);
				} catch (ex) {
					socket.emit('exception', {message: ex.message, status: ex.status});
				}
			})
		}

		socket.onX('topic_channel_read', async topicId => {
			const id = parseId(topicId);
			await userHasAccessToTopic(socket.session.id, id);

			await topicChannelRead(topicId, socket.session.id);
		})
	});
}

module.exports = {startSocketServer};