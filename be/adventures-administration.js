const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty, validateType} = require("./utils/validations");
const {BadRequest, NotFound} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {saveCourse, updateCourse, validateCourseExists, updateCourseState} = require("./courses");
const {courseTypes} = require("./constants");

const app = express();
const db = new SQLBuilder();

const validateAdventureCourse = async id => await validateCourseExists(id, courseTypes.ADVENTURE.description);

app.post_json('/adventures', async req => await saveCourse(req.session.id, true, req.body));

app.put_json('/adventures/:id([0-9]+)', async req => await updateCourse(parseId(req.params.id), req.body, true));

app.post_json('/adventures/:id([0-9]+)/state', async req => updateCourseState(req, async id => await validateAdventureCourse(id)));

app.get_json('/adventures/administration/list', async req => {
	return await db.select('courses')
		.where('type = ?', courseTypes.ADVENTURE.description)
		.getList();
});

module.exports = {app};