const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty, validateType} = require("./utils/validations");
const {BadRequest, NotFound} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {saveCourse, updateCourse, validateCourseExists, updateCourseState, saveWordHandler,
	deleteWord, getWords, updateWord, validateNodeBelongsToCourse
} = require("./courses");
const {courseTypes} = require("./constants");
const {validateAdventureNodePictureExists} = require("./adventure-node-pictures");

const app = express();
const db = new SQLBuilder();

const validateAdventureCourse = async id => await validateCourseExists(id, courseTypes.ADVENTURE.description);

async function validateNodeBelongsToAdventure(id, nodeId) {
	return await validateNodeBelongsToCourse(id, nodeId, courseTypes.ADVENTURE.description);
}

async function getNodesAtLevel(id, level) {
	return Number((await db.select('course_nodes')
		.fields('COUNT(*)')
		.where('course = ?', id)
		.where('level = ?', level)
		.oneOrNone()).count);
}

async function getNodeWithPicture(id) {
	return await db.select()
		.fields('course_nodes.*, anp.name, files.storage_path')
		.from(
			'course_nodes',
			'LEFT JOIN adventure_node_pictures AS anp ON anp.id = course_nodes.picture',
			'LEFT JOIN files ON anp.file = files.id'
		)
		.where('course_nodes.id = ?', id)
		.oneOrNone();
}

app.post_json('/adventures', async req => await saveCourse(req.session.id, true, req.body));

app.put_json('/adventures/:id([0-9]+)', async req => await updateCourse(parseId(req.params.id), req.body, true));

app.post_json('/adventures/:id([0-9]+)/state', async req => updateCourseState(req, async id => await validateAdventureCourse(id)));

app.get_json('/adventures/administration/list', async req => {
	return await db.select('courses')
		.where('type = ?', courseTypes.ADVENTURE.description)
		.getList();
});

app.post_json('/adventures/:id([0-9]+)/node', async req => {
	const id = parseId(req.params.id);
	let {name, description, number_of_completion, level, picture} = req.body;

	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(description, 'Description');
	validateType(number_of_completion, 'number');
	validateType(level, 'number');
	if (picture) {
		picture = parseId(picture);
		await validateAdventureNodePictureExists(picture);
	}

	if (level < 0) {
		throw new BadRequest('Level cannot be lower than 0', 'negative_level')
	}

	await validateAdventureCourse(id);

	const nodesAtLevel = await getNodesAtLevel(id, level);

	if (nodesAtLevel === 3) {
		throw new BadRequest('Maximum number of nodes at level reached', 'max_nodes_level');
	}

	if (number_of_completion < 1) {
		throw new BadRequest('Number of completion cannot be smaller than 1', 'number_of_completion_min');
	}

	const node = await db.insert('course_nodes', {
		course: id,
		state: 'creating',
		name,
		description,
		number_of_completion,
		level,
		picture
	}).oneOrNone();

	return await getNodeWithPicture(node.id);
});

app.get_json('/adventures/:id([0-9]+)/node/list', async req => {
	const id = parseId(req.params.id);
	await validateAdventureCourse(id);

	return await db.select()
		.fields('course_nodes.*, anp.name, files.storage_path')
		.from(
			'course_nodes',
			'LEFT JOIN adventure_node_pictures AS anp ON anp.id = course_nodes.picture',
			'LEFT JOIN files ON anp.file = files.id'
		)
		.where('course = ?', id)
		.more('ORDER BY level')
		.getList();
});

app.get_json('/adventures/:id([0-9]+)/node/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const nodeId = parseId(req.params.node);
	await validateNodeBelongsToAdventure(id, nodeId);

	return await getNodeWithPicture(nodeId);
})

app.put_json('/adventures/:id([0-9]+)/node/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const node = parseId(req.params.node);
	let {name, description, number_of_completion, picture} = req.body;

	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(description, 'Description');
	validateType(number_of_completion, 'number');
	if (picture) {
		picture = parseId(picture);
		await validateAdventureNodePictureExists(picture);
	}

	if (number_of_completion < 1) {
		throw new BadRequest('Number of completion cannot be smaller than 1');
	}

	await validateNodeBelongsToAdventure(id, node);

	await db.update('course_nodes')
		.set({
			name,
			description,
			number_of_completion,
			picture
		})
		.whereId(node)
		.oneOrNone();

	return await getNodeWithPicture(node);
});

app.delete_json('/adventures/:id([0-9]+)/node/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const nodeId = parseId(req.params.node);
	const {node} = await validateNodeBelongsToAdventure(id, nodeId);

	const nodesAtLevel = await getNodesAtLevel(id, node.level);

	if (nodesAtLevel === 1) {
		throw new BadRequest('Cannot delete last node at the level', 'last_node');
	}

	await db.deleteById('course_nodes', nodeId);
});

app.put_json('/adventures/:id([0-9]+)/node/:node([0-9]+)/publish', async req => {
	const id = parseId(req.params.id);
	const node = parseId(req.params.node);
	await validateNodeBelongsToAdventure(id, node);

	return await db.update('course_nodes')
		.set({state: 'published'})
		.whereId(node)
		.oneOrNone();
});

app.post_json('/adventures/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => saveWordHandler(req, async (node, courseId, userId) => {
	const {course} = await validateNodeBelongsToAdventure(courseId, node);
	return course;
}));

app.put_json('/adventures/:id([0-9]+)/words/:group([0-9]+)', async req => await updateWord(req, async (nodeId, courseId, userId) => {
	await validateNodeBelongsToAdventure(courseId, nodeId);
}));

app.delete_json('/adventures/:id([0-9]+)/words/:group([0-9]+)', async req => await deleteWord(req, async (nodeId, courseId, userId) => {
	await validateNodeBelongsToAdventure(courseId, nodeId);
}));

app.get_json('/adventures/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => await getWords(req, async (node, courseId, userId) => {
	await validateNodeBelongsToAdventure(courseId, node);
}));

module.exports = {app, getNodesAtLevel, validateAdventureCourse};