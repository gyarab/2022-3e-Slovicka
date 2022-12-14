const SQLBuilder = require('./utils/SQLBuilder');
const { Server } = require("socket.io");
const env = require('./env');
const cookie = require('cookie');
const sessions = require('./sessions');
const {parseId} = require("./utils/utils");
const {validateUserHasAccessToCourse} = require("./courses");
const {Conflict, NotFound} = require("./utils/aexpress");

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

async function endCourseStudyTime(userId) {
	const courseInProgress = await db.select('course_study_time')
		.where('"user" = ?', userId)
		.where('"to" IS NULL')
		.oneOrNone();

	if (!courseInProgress) {
		throw new NotFound();
	}

	await db.update('course_study_time')
		.set({to: new Date()})
		.where('"to" IS NULL')
		.where('"user" = ?', userId)
		.run();
}

function startSocketServer(server) {
	const io = new Server(server);

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

		socket.onX('disconnect', async () => {
			await endCourseStudyTime(socket.session.id);
		});

		socket.onX('course_start_studying', async courseId => {
			const id = parseId(courseId);
			await validateUserHasAccessToCourse(id, socket.session.id);

			const courseInProgress = await db.select('course_study_time')
				.where('"user" = ?', socket.session.id)
				.where('"to" IS NULL')
				.oneOrNone();

			if (courseInProgress && id !== courseInProgress.id) {
				throw new Conflict('Cannot study 2 courses at the same time', 'studying_two_courses');
			}

			if (!courseInProgress) {
				await db.insert('course_study_time', {
					course: id,
					"user": socket.session.id
				}).run();
			}

			await db.insert('last_course_interaction', {
				"user": socket.session.id,
				course: id
			}).run()
		})

		socket.onX('course_end_studying', async () => {
			await endCourseStudyTime(socket.session.id);
		})
	});
}

module.exports = {startSocketServer};