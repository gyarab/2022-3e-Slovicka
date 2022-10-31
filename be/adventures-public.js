const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {Unauthorized} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {courseTypes} = require("./constants");
const {validateAdventureCourse} = require("./adventures-administration");

const app = express();
const db = new SQLBuilder();

app.get_json('/adventures/list', async req => {
	const withRatings =  Boolean(req.query.withRatings) === true;

	const query = db.select()
		.fields('courses.*')
		.from('courses')
		.where('type = ?', courseTypes.ADVENTURE.description)
		.where('state = ?', 'published');

	if (withRatings) {
		query
			.fields('AVG(cr.value)::numeric(2, 1)')
			.from('LEFT JOIN course_ratings AS cr ON cr.course = courses.id')
			.more('GROUP BY courses.id')
	}

	return query.getList();
});

app.get_json('/adventures/:id([0-9]+)/nodes', async req => {
	const id = parseId(req.params.id);
	const course = await validateAdventureCourse(id);

	if (course.state !== 'published') {
		throw new Unauthorized();
	}

	return await db.select('course_nodes')
		.fields('cn.*, cns.number_of_completion')
		.from(
			'course_nodes AS cn',
			'LEFT JOIN course_node_state AS cns ON cns.course_node = cn.id'
		)
		.where('cn.state = ?', 'published')
		.where('course = ?', id)
		.more('ORDER BY level')
		.getList();
});

module.exports = {app};