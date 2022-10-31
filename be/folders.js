const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringIfNotNull, validateStringNotEmpty} = require("./utils/validations");
const {parseId} = require("./utils/utils");
const {NotFound, Unauthorized} = require("./utils/aexpress");
const {validateUserHasAccessToCourse} = require("./courses");

const app = express();
const db = new SQLBuilder();

async function validateFolderExists(id) {
	const folder = await db.oneOrNoneById('folders', id);

	if (!folder) {
		throw new NotFound('Folder not found', 'folder_not_found');
	}

	return folder;
}

async function validateUserCanEditFolder(id, userId) {
	const folder = await validateFolderExists(id);

	if (folder.user !== userId) {
		throw new Unauthorized();
	}

	return folder;
}

app.post_json('/folders', async req => {
	const {name, description} = req.body;

	validateStringIfNotNull(description, 'Description');
	validateStringNotEmpty(name, 'Name');

	return await db.insert('folders', {
			"user": req.session.id,
			name,
			description
		})
		.oneOrNone();
});

app.put_json('/folders/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const {name, description} = req.body;

	validateStringIfNotNull(description, 'Description');
	validateStringNotEmpty(name, 'Name');
	await validateUserCanEditFolder(id, req.session.id);

	return await db.update('folders')
		.set({name, description})
		.whereId(id)
		.oneOrNone();
});

app.delete_json('/folders/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);

	await validateUserCanEditFolder(id, req.session.id);

	await db.deleteById('folders', id);
});

app.get_json('/folders', async req => {
	return await db.select('folders')
		.where('"user" = ?', req.session.id)
		.getList();
});

app.post_json('/folders/:id([0-9]+)/course/:course([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const courseId = parseId(req.params.course);

	await validateUserCanEditFolder(id);
	await validateUserHasAccessToCourse(courseId, req.session.id);

	await db.insert('course_folders', {
		course: courseId,
		folder: id
	})
	.run();
});

app.delete_json('/folders/:id([0-9]+)/course/:course([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const courseId = parseId(req.params.course);

	await validateUserCanEditFolder(id);
	await validateUserHasAccessToCourse(courseId, req.session.id);

	await db.delete('course_folders AS cf USING folders f')
		.where('f.id = cf.folder')
		.where('f."user" = ?', req.session.id)
		.where('cf.folder = ?', id)
		.where('cf.course = ?', courseId)
		.run();
});

module.exports = {app};