const express = require('express');
const {validateStringNotEmpty, validateType} = require("./utils/validations.js");
const {ApiError} = require("./utils/aexpress.js");
const sessions = require("./sessions.js");
const {parseId} = require("./utils/utils.js");
const SQLBuilder = require("./utils/SQLBuilder.js");

const app = express();
const db = new SQLBuilder();

async function checkUserExistence(id) {
	const user = await sessions.getUserInternal(id);

	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	return user
}

app.post_json('/users/create', async req => {
	const {active, email, password, role, name, surname} = req.body;

	validateStringNotEmpty(email, 'Email');
	validateStringNotEmpty(password, 'Password');
	validateStringNotEmpty(role, 'Role');
	validateStringNotEmpty(surname, 'Surname');
	validateStringNotEmpty(name, 'Name');
	validateType(active, 'boolean');

	if (role !== 'EDITOR' && role !== 'ADMIN') {
		throw new ApiError(404, 'Role not found');
	}

	const existingUser = await sessions.getUserByEmail(email);

	if (existingUser) {
		throw new ApiError(409, 'Account already exists ' + email);
	}

	const passwordHash = await sessions.hash_password(password);

	return await db.insert("users", {
		password: passwordHash,
		email,
		role,
		name,
		surname,
		active,
		verified: true
	})
		.fields('id, email, active, role, name, surname')
		.oneOrNone();
})

app.post_json('/users/user-edit/:id', async req => {
	const id = parseId(req.params.id);
	const {email, password, role, name, surname, active} = req.body;

	validateStringNotEmpty(email, 'Email');
	validateStringNotEmpty(role, 'Role');
	validateStringNotEmpty(surname, 'Surname');
	validateStringNotEmpty(name, 'Name');
	validateType(active, 'boolean');

	if (role !== 'ADMIN' && role !== 'USER') {
		throw new ApiError(404, 'Role not found');
	}

	const user = await checkUserExistence(id);

	if (user.role === 'CLIENT') {
		throw new ApiError(400, 'Cannot edit client');
	}

	const duplicateEmail = await sessions.getUserByEmail(email);

	if (user.email !== email && duplicateEmail) {
		throw new ApiError(400, 'Email is already used')
	}

	const update = db.update('users')
		.fields('id, email, active, role, name, surname')
		.set({name, surname, active})
		.where('id = ?', id);

	if (password) {
		validateStringNotEmpty(password, 'New password');
		const passwordHash = await sessions.hash_password(password);

		update.set('password', passwordHash)
	}

	if (email !== user.email) {
		update.set('email', email);
	}

	if (role !== user.role) {
		update.set('role', role);
	}

	return await update.oneOrNone();
});

app.get_json('/users/list', async req => {
	const roles = Array.isArray(req.query.role) ? req.query.role : [req.query.role];

	const rolesAvailable = {
		'USER': 'ADMIN',
		'ADMIN': 'ADMIN'
	};

	for (const r of roles) {
		const role = rolesAvailable[r];

		if (!role) {
			throw new ApiError(404, 'Role not found');
		}

		if (!role.includes(req.session.role)) {
			throw new ApiError(401);
		}
	}

	return await db.select('users')
		.fields('id, email, active, role, name, surname, lang')
		.in('role', roles)
		.getList();
});

module.exports = {
	app,
	checkUserExistence
}