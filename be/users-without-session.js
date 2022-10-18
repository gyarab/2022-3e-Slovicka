const {validateObjectNotEmpty, validateStringNotEmpty} = require('./utils/validations.js');
const {ApiError} = require("./utils/aexpress.js");
const express = require('express');
const mailer = require("./extensions/sendgrid.js");
const tokens = require("./utils/tokens.js");
const env = require ("./env.js");
const {hash_password, getUserByEmail, getUserInternal} = require("./sessions.js");
const SQLBuilder = require('./utils/SQLBuilder');

let app = express();
const db = new SQLBuilder();

app.post_json('/users/signup', async (req) => {
	const user = req.body;

	validateObjectNotEmpty(user);
	validateStringNotEmpty(user.email, 'Email');
	validateStringNotEmpty(user.password, 'Password');
	validateStringNotEmpty(user.name, 'Name');
	validateStringNotEmpty(user.surname, 'Surname')

	const existingEmail = await getUserByEmail(user.email);

	if (existingEmail && existingEmail.verified === true) {
		throw new ApiError(409, 'Account already exists ' + user.email);
	}

	const passwordHash = await hash_password(user.password);

	const update = {
		email: user.email,
		password: passwordHash,
		role: 'CLIENT',
		name: user.name,
		surname: user.surname,
		verified: !env.users.verify_email_address
	};

	const userCreated = await (existingEmail ?
		db.update('users')
			.set(update)
			.whereId(existingEmail.id)
			.oneOrNone() :
		db.insert("users", update).oneOrNone());


	if (env.users.verify_email_address) {
		await tokens.cancelAllUserTokens(userCreated.id);
		const token = await tokens.createToken({
			user: userCreated.id,
			expiration: 30,
			purpose: 'account-activation'
		})

		await mailer.sendEmail(env.sendgrid.templates.signup_confirmation, userCreated.email, {
			url: `${env.url}/account-activate?account-activate=${token.code}`
		});
	}

	return userCreated;
});

app.post_json('/users/account-activate', async (req) => {
	const tokenCode = req.body?.token;

	validateStringNotEmpty(tokenCode);

	const token = await tokens.checkToken(tokenCode);

	if (!token) {
		throw new ApiError(400, 'Bad token');
	}

	if (token.purpose !== 'account-activation') {
		throw new ApiError(400, 'Bad token');
	}

	const user = await getUserInternal(token.user);

	if (user.verified === true) {
		throw new ApiError(400, 'User is already activated');
	}

	db.update("users")
		.set("verified", true)
		.where("id = ?", user.id)
		.run();

	await tokens.cancelToken(tokenCode);
});

app.post_json('/users/resend-activation-email', async (req) => {
	const email = req.body?.email;

	validateStringNotEmpty(email, 'Email');
	const user = await getUserByEmail(email);

	if (!user) {
		throw new ApiError(404, 'User with email does not exist');
	}

	if (!!user.verified) {
		throw new ApiError(400, 'User is already verified')
	}

	const token = await tokens.getTokenByPurposeAndUser(user.id, 'account-activation');

	await mailer.sendEmail(env.sendgrid.templates.signup_confirmation, email, {
		url: `${env.url}/account-activate?account-activate=${token.code}`
	});

	return true;
});

app.post_json('/users/restore-password', async (req) => {
	const email = req.body?.email;

	validateStringNotEmpty(email, 'Email');

	const user = await getUserByEmail(email);

	if (!user) {
		throw new ApiError(404, 'User with email does not exist');
	}

	if (user.verified === false) {
		throw new ApiError(400, 'User is not confirmed')
	}

	await tokens.cancelAllUserTokens(user.id);
	const token = await tokens.createToken({
		user: user.id,
		expiration: 30,
		purpose: 'password-restore'
	})

	await mailer.sendEmail(env.sendgrid.templates.password_recovery, email, {
		url: `${env.url}/password-restore?password-restore=${token.code}`
	});
});

app.post_json('/users/complete-restore-password', async (req) => {
	const tokenCode = req.body?.token;

	validateStringNotEmpty(tokenCode);
	validateStringNotEmpty(req.body?.password, 'Password');

	const token = await tokens.checkToken(tokenCode);

	if (!token) {
		throw new ApiError(400, 'Bad token');
	}

	if (token.purpose !== 'password-restore') {
		throw new ApiError(400, 'Bad token');
	}

	const user = await getUserInternal(token.user);

	if (user.verified === false) {
		throw new ApiError(400, 'User is not activated');
	}

	const passwordHash = await hash_password(req.body.password);

	await db.update('users')
		.set('password', passwordHash)
		.where('id = ?', user.id)
		.run();

	await tokens.cancelToken(tokenCode);
})

module.exports = {app}