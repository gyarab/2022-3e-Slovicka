const roles = {
	// Admin like users
	ADMIN: Symbol('ADMIN'),
	EDITOR: Symbol('EDITOR'),

	// Normal users
	USER: Symbol('USER')
}

const courseTypes = {
	ADVENTURE: Symbol('ADVENTURE'),
	USER: Symbol('USER')
}

const COURSE_RATING_LIMIT = 10;

module.exports = {courseTypes, roles, COURSE_RATING_LIMIT}

