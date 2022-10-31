const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty, validateType} = require("./utils/validations");
const {BadRequest, NotFound} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {saveCourse, updateCourse, validateCourseExists, updateCourseState, saveWordHandler,
	deleteWord, getWords, updateWord, validateNodeBelongsToCourse
} = require("./courses");
const {courseTypes} = require("./constants");

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
	const {name, description, number_of_completion, level} = req.body;

	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(description, 'Description');
	validateType(number_of_completion, 'number');
	validateType(level, 'number');

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

	return await db.insert('course_nodes', {
		course: id,
		state: 'creating',
		name,
		description,
		number_of_completion,
		level
	})
		.oneOrNone();
});

app.get_json('/adventures/:id([0-9]+)/node/list', async req => {
	const id = parseId(req.params.id);
	await validateAdventureCourse(id);

	return await db.select('course_nodes')
		.where('course = ?', id)
		.more('ORDER BY level')
		.getList();
});

app.get_json('/adventures/:id([0-9]+)/node/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const nodeId = parseId(req.params.node);
	const {node} = await validateNodeBelongsToAdventure(id, nodeId);

	return node;
})

app.put_json('/adventures/:id([0-9]+)/node/:node([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const node = parseId(req.params.node);
	const {name, description, number_of_completion} = req.body;

	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(description, 'Description');
	validateType(number_of_completion, 'number');

	if (number_of_completion < 1) {
		throw new BadRequest('Number of completion cannot be smaller than 1');
	}

	await validateNodeBelongsToAdventure(id, node);

	return await db.update('course_nodes')
		.set({
			name,
			description,
			number_of_completion
		})
		.whereId(node)
		.oneOrNone();
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