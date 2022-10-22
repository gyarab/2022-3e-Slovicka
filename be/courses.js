const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty} = require("./utils/validations");
const {Unauthorized, NotFound} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {validateLanguageExists} = require("./languages");
const {courseTypes} = require("./constants");

const app = express();
const db = new SQLBuilder();

async function validateCourseExists(id, state) {
	let course = await db.select('courses')
		.whereId(id);

	if (state) {
		course.where('type = ?', state);
	}

	course = await course.oneOrNone();

	if (!course) {
		throw new NotFound();
	}

	return course;
}

const validateCourseIsUSERType = async id => await validateCourseExists(id, courseTypes.USER.description);

async function userHasAccessToEditCourse(id, userId) {
	const course = await validateCourseIsUSERType(id);

	if (course.owner !== userId) {
		throw new Unauthorized();
	}

	return course;
}

async function prepareCourseEditableData(data) {
	const {name, description, language} = data;

	await validateLanguageExists(language)
	validateStringNotEmpty(name, 'Name');
	validateStringNotEmpty(description, 'Description');

	return {name, description, language};
}

async function saveCourse(sessionId, adventure, data) {
	const create = await prepareCourseEditableData(data);

	return await db.insert('courses', {
		...create,
		type: adventure ? courseTypes.ADVENTURE.description : courseTypes.USER.description,
		owner: adventure ? null : sessionId,
		visible_to: adventure ? null : 'ME',
		state: 'creating'
	})
		.oneOrNone();
}

async function updateCourse(id, data, adventure, userId) {
	const course = await validateCourseExists(id, adventure ? courseTypes.ADVENTURE.description : courseTypes.USER.description);

	if (course.type === courseTypes.USER.description && course.owner !== userId) {
		throw new Unauthorized();
	}

	const update = await prepareCourseEditableData(data);

	return await db.update('courses')
		.set(update)
		.whereId(id)
		.oneOrNone();
}

async function validateUserHasRightsToEditNode(id, courseId, userId) {
	const course = await validateCourseExists(courseId, courseTypes.USER.description);

	if (course.owner !== userId) {
		throw new Unauthorized();
	}

	const node = await db.oneOrNoneById('course_nodes', id);

	if (node.course !== courseId) {
		throw new Unauthorized();
	}

	return {course, node};
}

async function validateUserHasAccessToCourse(courseId, userId) {
	const course = await validateCourseExists(courseId, courseTypes.USER.description);

	if (!(course.owner === userId || course.visible_to === 'EVERYONE' && course.state === 'published')) {
		throw new Unauthorized();
	}

	return course;
}

async function validateUserHasAccessToNode(id, courseId, userId) {
	const course = await validateUserHasAccessToCourse(courseId, userId);

	const node = await db.oneOrNoneById('course_nodes', id);

	if (node.course !== courseId) {
		throw new Unauthorized();
	}

	return {course, node};
}

async function validateWordExists(id) {
	const word = await db.oneOrNoneById('words', id);

	if (!word) {
		throw new NotFound();
	}

	return word;
}

async function validateWordGroupExists(id) {
	const group = await db.oneOrNoneById('word_groups', id);

	if (!group) {
		throw new NotFound();
	}

	return group;
}

function validateStringIfNotNull (val, label) {
	if (val) {
		validateStringNotEmpty(val, label);
	}

	return val;
}

const prepareGroupWordUpdate = data => ({
	definition: validateStringIfNotNull(data.definition, 'Definition'),
	translation: validateStringIfNotNull(data.translation, 'Translation'),
	phonetic: validateStringIfNotNull(data.phonetic, 'Phonetic'),
	sentence: validateStringIfNotNull(data.sentence, 'Sentence')
})

function prepareGetWordWithGroupQuery() {
	return db.select()
		.fields('gr.id AS group, wo.word, wo.id, wo.language, COALESCE(gr.definition, wo.definition) AS definition, ' +
			'COALESCE(gr.translation, wo.translation) AS translation, COALESCE(gr.phonetic, wo.phonetic) AS phonetic, ' +
			'COALESCE(gr.sentence, wo.sentence) AS sentence')
		.from(
			'word_groups AS gr',
			'INNER JOIN words AS wo ON gr.word = wo.id'
		);
}

async function saveWord(nodeId, data) {
	let {wordId, word, language} = data;

	await validateLanguageExists(language);

	if (!wordId) {
		wordId = (await db.select('words')
			.where('word = ?', word)
			.where('language = ?', language)
			.oneOrNone())?.id;
	} else {
		await validateWordExists(wordId);
	}

	const update = prepareGroupWordUpdate(data);
	let groupId;

	if (!wordId) {
		validateStringNotEmpty(word, 'Word');

		const wordDb = await db.insert('words', {
				word,
				language,
				...update
			})
			.oneOrNone();

		groupId = (await db.insert('word_groups', {
				course_node: nodeId,
				word: wordDb.id,
			})
			.oneOrNone()).id;
	} else {
		groupId = (await db.insert('word_groups', {
				course_node: nodeId,
				word: wordId,
				...update
			})
			.oneOrNone()).id;
	}

	return prepareGetWordWithGroupQuery()
		.where('gr.id = ?', groupId)
		.oneOrNone();
}

async function getCourseWithRootNode(id) {
	const course = await db.oneOrNoneById('courses', id);
	const node = await db.select('course_nodes')
		.where('course = ?', id)
		.oneOrNone();

	return {
		...course,
		node: node.id
	}
}

async function updateCourseState(req, validate) {
	const id = parseId(req.params.id);
	const {state} = req.body;

	validateStringNotEmpty(state);
	await validate(id, req);

	if (!['published', 'paused', 'closed'].includes(state)) {
		throw new NotFound('State not found', 'state_not_found');
	}

	return await db.update('courses')
		.set({state})
		.whereId(id)
		.oneOrNone();
}

app.post_json('/courses', async req => {
	const course = await saveCourse(req.session.id, false, req.body)

	const rootNode = await db.insert('course_nodes', {
			level: 0,
			course: course.id
		})
		.oneOrNone();

	course.node = rootNode.id;

	return course
});
app.put_json('/courses/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	await updateCourse(id, req.body, false, req.session.id);
	return await getCourseWithRootNode(id);
});

app.put_json('/courses/:id([0-9]+)/state', async req => await updateCourseState(req, async (id, req) => {
	await userHasAccessToEditCourse(id, req.session.id);
}));

app.delete_json('/courses/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	await userHasAccessToEditCourse(id, req.session.id);
	await db.deleteById('courses', id);
});

app.get_json('/courses/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	await validateUserHasAccessToCourse(id, req.session.id);
	return await getCourseWithRootNode(id);
});

app.put_json('/courses/:id([0-9]+)/visibility', async req => {
	const id = parseId(req.params.id);
	const {visibility} = req.body;
	await validateUserHasAccessToCourse(id, req.session.id);

	if (!['ME', 'EVERYONE'].includes(visibility)) {
		throw new NotFound('Visibility state not found', 'wrong_state');
	}

	return await db.update('courses')
		.set({visible_to: visibility})
		.whereId(id)
		.oneOrNone();
});

app.get_json('/courses/list', async req => {
	const editable = Boolean(req.query.onlyMy) === true;

	const query = await db.select()
		.fields('courses.*, cn.id AS node')
		.from(
			'courses',
			'INNER JOIN course_nodes AS cn ON cn.course = courses.id'
		)
		.where('courses.state = ?', courseTypes.USER.description)


	if (editable) {
		query.where('owner = ?', req.session.id);
	} else {
		query.where(
			'(visible_to = ? AND courses.state = ?) OR ' +
			'(owner = ? AND visible_to = ?)', 'EVERYONE', 'published', req.session.id, 'ME');
	}

	return await query.getList();
});

app.post_json('/courses/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => {
	const courseId = parseId(req.params.id);
	const node = parseId(req.params.node);
	const {course} = await validateUserHasRightsToEditNode(node, courseId, req.session.id);
	const data = req.body;

	data.language = course.language;
	data.wordId = req.body.wordId ? parseId(req.body.wordId) : null;

	return await saveWord(node, data);
});

app.put_json('/courses/:id([0-9]+)/words/:group([0-9]+)', async req => {
	const courseId = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const group = await validateWordGroupExists(groupId);

	await validateUserHasRightsToEditNode(group.course_node, courseId, req.session.id);

	await db.update('word_groups')
		.set(prepareGroupWordUpdate(req.body))
		.whereId(groupId)
		.oneOrNone();

	return prepareGetWordWithGroupQuery()
		.where('gr.id = ?', groupId)
		.oneOrNone();
});

app.delete_json('/courses/:id([0-9]+)/words/:group([0-9]+)', async req => {
	const courseId = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const group = await validateWordGroupExists(groupId);

	await validateUserHasRightsToEditNode(group.course_node, courseId, req.session.id);
	await db.deleteById('word_groups', groupId);
});

app.get_json('/courses/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => {
	const courseId = parseId(req.params.id);
	const node = parseId(req.params.node);

	await validateUserHasAccessToNode(node, courseId, req.session.id);

	return prepareGetWordWithGroupQuery()
		.where('gr.course_node = ?', node)
		.getList()
});

module.exports = {app, saveCourse, updateCourse, validateCourseExists, updateCourseState};