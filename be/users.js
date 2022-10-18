const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty} = require("./utils/validations");
const {hash_password, verify_password} = require("./sessions");
const {ApiError} = require("./utils/aexpress.js");
const ENV = require("./env");

const app = express();
const db = new SQLBuilder();

app.put_json('/users/password-change', async req => {
	const {old_password, new_password} = req.body;

	validateStringNotEmpty(old_password, 'New password');
	validateStringNotEmpty(new_password, 'Old password');

	const user = await db.oneOrNoneById('users', req.session.id);

	const passValidated = await verify_password(user.password, old_password);
	if (!passValidated) {
		throw new ApiError(401, 'Invalid password');
	}

	const passwordHash = await hash_password(new_password);


	return await db.update('users')
		.set({
			password: passwordHash
		})
		.where('id = ?', req.session.id)
		.oneOrNone();
});

app.put_json('/users/lang-change', async (req, res) => {
	const {lang} = req.body;

	validateStringNotEmpty(lang);

	if (!['cz', 'en'].includes(lang)) {
		throw new ApiError(404);
	}

	await db.update('users')
		.set({lang})
		.whereId(req.session.id)
		.run();

	res.cookie(ENV.lang_cookie_name, lang, {maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: true, secure: false, sameSite: 'strict'});

	return lang;
});

app.get_json('/users/lang', async req => (await db.oneOrNoneById('users', req.session.id)).lang);

module.exports = {app};