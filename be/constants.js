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

module.exports = {courseTypes, roles}

