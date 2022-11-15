const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {Unauthorized} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {courseTypes} = require("./constants");
const {validateAdventureCourse} = require("./adventures-administration");

const app = express();
const db = new SQLBuilder();

async function validateUserCanAccessAdventure(id) {
	const adventure = await validateAdventureCourse(id);

	if (adventure.state !== 'published') {
		throw new Unauthorized();
	}

	return adventure;
}

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

app.get_json('/adventures/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	return await validateUserCanAccessAdventure(id);
})

app.get_json('/adventures/:id([0-9]+)/nodes', async req => {
	const id = parseId(req.params.id);
	await validateUserCanAccessAdventure(id);

	return await db.select()
		.fields('cn.*, cns.number_of_completion AS completed')
		.from(
			'course_nodes AS cn',
			'LEFT JOIN course_node_state AS cns ON cns.course_nodes = cn.id'
		)
		.where('cn.state = ?', 'published')
		.where('course = ?', id)
		.more('ORDER BY level')
		.getList();
});

module.exports = {app};