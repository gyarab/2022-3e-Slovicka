const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {Unauthorized} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {courseTypes} = require("./constants");
const {validateAdventureCourse} = require("./adventures-administration");
const {prepareCoursesRatingsInteractionsQuery, validateUserHasAccessToNode} = require("./courses");
const fs = require("fs");
const {validateAdventureNodePictureExists} = require("./adventure-node-pictures");

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
		.fields('cn.*, states.completed, anp.name, files.storage_path')
		.from(
			'course_nodes AS cn',
			`LEFT JOIN (SELECT SUM(cns.number_of_completion) AS completed, course_nodes FROM course_node_state AS cns
		       WHERE cns."user" = ${req.session.id} GROUP BY "user", course_nodes
	        ) AS states ON states.course_nodes = cn.id`,
			'LEFT JOIN adventure_node_pictures AS anp ON anp.id = cn.picture',
			'LEFT JOIN files ON anp.file = files.id'
		)
		.where('cn.state = ?', 'published')
		.where('course = ?', id)
		.more('ORDER BY level')
		.getList();
});

app.get_json('/adventures/:id([0-9]+)/nodes/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const nodeId = parseId(req.params.node);

	const {course} = await validateUserHasAccessToNode(id, nodeId, req.session.id);
	const node = await db.select()
		.from('course_nodes AS cn',
			`LEFT JOIN (SELECT SUM(cns.number_of_completion)::int AS number_of_completion, course_nodes FROM course_node_state AS cns
		       WHERE cns."user" = ${req.session.id} GROUP BY "user", course_nodes
	        ) AS states ON states.course_nodes = cn.id`
		)
		.fields('cn.number_of_completion AS required, states.number_of_completion AS number_of_completion')
		.whereId(nodeId)
		.oneOrNone()

	return {
		...course,
		node: nodeId,
		number_of_completion: node.number_of_completion,
		required_number_of_completion: node.required
	}
});

app.get_file('/adventures/node-picture/:id([0-9]+)', async (req, res) => {
	const id = parseId(req.params.id);
	const file = await validateAdventureNodePictureExists(id);

	const stream = fs.createReadStream(file.storage_path)

	const range = (req.headers.range || 'bytes=0-');
	const positions = range.replace(/bytes=/, "").split("-");
	const start = parseInt(positions[0], 10);
	const end = positions[1] !== '' ? parseInt(positions[1], 10) : file.size - 1;

	res.writeHead(file.type.includes('video') ? 206 : 200, {
		"Content-Range": `bytes ${start}-${end}/${file.size}`,
		"Accept-Ranges": "bytes",
		"Content-Length": (end - start) + 1,
		"Content-Type": file.type
	});
	stream.pipe(res);
});


module.exports = {app};