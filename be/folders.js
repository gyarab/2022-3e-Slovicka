const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringIfNotNull, validateStringNotEmpty} = require("./utils/validations");
const {parseId} = require("./utils/utils");
const {NotFound, Unauthorized, Conflict} = require("./utils/aexpress");
const {validateUserHasAccessToCourse, validateCourseExists} = require("./courses");
const {courseTypes} = require("./constants");

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
	return await db.select()
		.fields('id, name, description, cs.courses')
		.from(
			'folders',
			`LEFT JOIN (
                SELECT folder, COUNT(*)::int AS courses FROM course_folders GROUP BY folder
            ) cs ON cs.folder = folders.id`
		)
		.where('"user" = ?', req.session.id)
		.getList();
});

app.post_json('/folders/:id([0-9]+)/course/:course([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const courseId = parseId(req.params.course);

	await validateUserCanEditFolder(id, req.session.id);
	const course = await validateCourseExists(courseId);

	if ((course.type === courseTypes.ADVENTURE.description && course.state !== 'published') ||
		course.type === courseTypes.USER.description && !(course.owner === req.session.id || course.visible_to === 'EVERYONE' && course.state === 'published')) {
		throw new Unauthorized();
	}

	const courseIsAlreadyInFolder = await db.select()
		.from('folders', 'INNER JOIN course_folders AS cf ON cf.folder = folders.id')
		.whereId(id)
		.where('course = ?', courseId)
		.where('"user" = ?', req.session.id)
		.oneOrNone();

	if (courseIsAlreadyInFolder) {
		throw new Conflict('Course is already in folder', 'course_already_added');
	}

	await db.insert('course_folders', {
		course: courseId,
		folder: id
	})
	.run();
});

app.delete_json('/folders/:id([0-9]+)/course/:course([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const courseId = parseId(req.params.course);

	await validateUserCanEditFolder(id, req.session.id);
	await validateUserHasAccessToCourse(courseId, req.session.id);

	await db.delete('course_folders')
		.from('USING folders f')
		.where('f.id = course_folders.folder')
		.where('f."user" = ?', req.session.id)
		.where('course_folders.folder = ?', id)
		.where('course_folders.course = ?', courseId)
		.run();
});

app.get_json('/folders/:id([0-9]+)/courses', async req => {
	const id = parseId(req.params.id);

	await validateUserCanEditFolder(id, req.session.id);

	return await db.select()
		.fields('courses.name, courses.type, courses.id AS course_id, folders.id, courses.language')
		.from(
			'folders',
			'INNER JOIN course_folders AS cf ON cf.folder = folders.id',
			'INNER JOIN courses ON courses.id = cf.course'
		)
		.where('folders.id = ?', id)
		.where('"user" = ?', req.session.id)
		.getList();
})

module.exports = {app};