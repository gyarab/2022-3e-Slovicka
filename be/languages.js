const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty} = require("./utils/validations");
const {ApiError, NotFound} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");

const app = express();
const db = new SQLBuilder();

async function validateLanguageExists(id) {
	const lang = await db.oneOrNoneById('languages', id);

	if (!lang) {
		throw new NotFound('Language not found', 'language_not_found');
	}

	return lang;
}

async function validateLanguageReq(name, code) {
	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(code, 'Code');

	const langNameTaken = await db.select('languages')
		.where('name = ?', name)
		.oneOrNone();

	if (langNameTaken) {
		throw new ApiError(409, 'Language name is already used', 'lang_name');
	}

	const langCodeTaken = await db.select('languages')
		.where('code = ?', code)
		.oneOrNone();

	if (langCodeTaken) {
		throw new ApiError(409, 'Language code is already used', 'lang_code');
	}
}

app.post_json('/languages', async req => {
	const {name, code} = req.body;

	await validateLanguageReq(name, code);

	return await db.insert('languages', {
		name,
		code
	})
		.oneOrNone();
});

app.put_json('/languages/:id([0-9])', async req => {
	const id = parseId(req.params.id);
	const {name, code} = req.body;

	await validateLanguageExists(id);
	await validateLanguageReq(name, code);

	return await db.update('languages')
		.set({
			name,
			code
		})
		.whereId(id)
		.oneOrNone();
});

module.exports = {app, validateLanguageExists};