const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {Unauthorized} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {courseTypes} = require("./constants");
const {validateAdventureCourse} = require("./adventures-administration");
const {prepareCoursesRatingsInteractionsQuery, validateUserHasAccessToNode} = require("./courses");

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
	const orderByInteractions = Boolean(req.query.interactions) === true;
	const limit = req.query.limit && parseId(req.query.limit);

	const query = db.select()
		.fields('courses.*')
		.from('courses')
		.where('type = ?', courseTypes.ADVENTURE.description)
		.where('state = ?', 'published');

	prepareCoursesRatingsInteractionsQuery(req.session.id, query, {
		withRatings,
		orderByInteractions,
		limit
	});

	if (withRatings) {
		query.more('GROUP BY courses.id');
	}

	return await query.getList();
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

app.get_json('/adventures/:id([0-9]+)/nodes/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const nodeId = parseId(req.params.node);

	const {course, node} = await validateUserHasAccessToNode(id, nodeId, req.session.id);

	return {
		...course,
		node: node.id
	}
})

module.exports = {app};