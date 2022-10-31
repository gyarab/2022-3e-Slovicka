const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const {validateStringNotEmpty, validateStringIfNotNull, validateType} = require("./utils/validations");
const {Unauthorized, NotFound, BadRequest} = require("./utils/aexpress");
const {parseId} = require("./utils/utils");
const {validateLanguageExists} = require("./languages");
const {courseTypes, COURSE_RATING_LIMIT} = require("./constants");

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
	const {course, node} = await validateNodeBelongsToCourse(courseId, id, courseTypes.USER.description);

	if (course.owner !== userId) {
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

async function saveWordHandler(req, validate) {
	const courseId = parseId(req.params.id);
	const node = parseId(req.params.node);
	const course = await validate(node, courseId, req.session.id);
	const data = req.body;

	data.language = course.language;
	data.wordId = req.body.wordId ? parseId(req.body.wordId) : null;

	return await saveWord(node, data);
}

async function updateWord(req, validate) {
	const courseId = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const group = await validateWordGroupExists(groupId);

	await validate(group.course_node, courseId, req.session.id);

	await db.update('word_groups')
		.set(prepareGroupWordUpdate(req.body))
		.whereId(groupId)
		.oneOrNone();

	return prepareGetWordWithGroupQuery()
		.where('gr.id = ?', groupId)
		.oneOrNone();
}

async function deleteWord(req, validate) {
	const courseId = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const group = await validateWordGroupExists(groupId);

	await validate(group.course_node, courseId, req.session.id);
	await db.deleteById('word_groups', groupId);
}

async function getWords(req, validate) {
	const courseId = parseId(req.params.id);
	const node = parseId(req.params.node);

	await validate(node, courseId, req.session.id);

	return prepareGetWordWithGroupQuery()
		.where('gr.course_node = ?', node)
		.getList()
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

async function validateNodeBelongsToCourse(id, nodeId, state) {
	const course = await validateCourseExists(id, state);

	const node = await db.select('course_nodes')
		.where('id = ?', nodeId)
		.where('course = ?', id)
		.oneOrNone();

	if (!node) {
		throw new NotFound('Node not found', 'node_not_found');
	}

	return {node, course}
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
	const withRatings = Boolean(req.query.withRatings) === true;

	const query = await db.select()
		.fields('courses.*, cn.id AS node')
		.from(
			'courses',
			'INNER JOIN course_nodes AS cn ON cn.course = courses.id'
		)
		.where('courses.type = ?', courseTypes.USER.description)

	if (withRatings) {
		query
			.fields('AVG(cr.value)::numeric(2, 1)')
			.from('LEFT JOIN course_ratings AS cr ON cr.course = courses.id')
			.more('GROUP BY courses.id, cn.id');
	}

	if (editable) {
		query.where('owner = ?', req.session.id);
	} else {
		query.where(
			'(visible_to = ? AND courses.state = ?) OR ' +
			'(owner = ? AND visible_to = ?)', 'EVERYONE', 'published', req.session.id, 'ME');
	}

	return await query.getList();
});

app.post_json('/courses/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => await saveWordHandler(req, async (node, courseId, userId) => {
	const {course} = await validateUserHasRightsToEditNode(node, courseId, userId);
	return course;
}));

app.put_json('/courses/:id([0-9]+)/words/:group([0-9]+)', async req => await updateWord(req, async (nodeId, courseId, userId) => {
	await validateUserHasRightsToEditNode(nodeId, courseId, userId);
}));

app.delete_json('/courses/:id([0-9]+)/words/:group([0-9]+)', async req => await deleteWord(req, async (nodeId, courseId, userId) => {
	await validateUserHasRightsToEditNode(nodeId, courseId, userId);
}));

async function validateUserHasAccessToAdventureNode(courseId, level) {
	const nodes = await db.select()
		.from('course_nodes AS cn', 'LEFT JOIN course_node_state cns on cns.course_nodes = cn.id')
		.fields('cn.number_of_completion AS required, cns.number_of_completion AS completed')
		.where('cn.course = ?', courseId)
		.where('level = ?', level - 1)
		.getList();

	for (const n of nodes) {
		if (n.required > n.completed) {
			throw new Unauthorized();
		}
	}
}

async function validateUserHasAccessToNode(courseId, nodeId, userId) {
	const {course, node} = await validateNodeBelongsToCourse(courseId, nodeId);

	if (course.type === courseTypes.USER.description) {
		await validateUserHasAccessToCourse(courseId, userId);
	} else {
		if (course.state !== 'published' || node.state === 'creating') {
			throw new Unauthorized();
		}

		if (node.level > 0) {
			await validateUserHasAccessToAdventureNode(courseId, node.level);
		}
	}
}

app.get_json('/courses/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => await getWords(req, async (nodeId, courseId, userId) => {
	await validateUserHasAccessToNode(courseId, nodeId, userId);
}));

app.get_json('/courses/:id([0-9]+)/words/:group([0-9]+)/state', async req => {
	const id = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const {state} = req.body;

	validateStringNotEmpty(state, 'State');

	if (state !== 'known' && state !== 'unknown') {
		throw new NotFound('State', 'state_not_found')
	}

	const group = await validateWordGroupExists(groupId);
	await validateUserHasAccessToNode(id, group.node, req.session.id);

	return await db.insert('word_state', {
			state,
			"user": req.session.id,
			group: groupId
		})
		.more(`ON CONFLICT ON CONSTRAINT word_group_user_unique 
			DO UPDATE SET state = ?`, state)
		.oneOrNone();
});

app.post_json('/courses/:id([0-9]+)/ratings', async req => {
	const id = parseId(req.params.id);
	const {rating} = req.body;

	await validateUserHasAccessToCourse(id, req.params.id);
	validateType(rating, 'number');

	if (Number.isInteger(rating)) {
		throw new BadRequest('Rating is not integer', 'rating_integer');
	}

	if (rating < 0) {
		throw new BadRequest('Rating cannot be lower than 0', 'negative_rating');
	}

	if (rating > COURSE_RATING_LIMIT) {
		throw new BadRequest(`Rating cannot be higher than ${COURSE_RATING_LIMIT}`, 'too_high_rating');
	}

	return await db.insert('course_ratings', {
			"user": req.session.id,
			course: id,
			value: rating
		})
		.more('ON CONFLICT ("user", course) DO UPDATE SET value = ?', rating)
		.oneOrNone()
});

module.exports = {
	app,
	saveCourse,
	updateCourse,
	validateCourseExists,
	updateCourseState,
	saveWordHandler,
	updateWord,
	deleteWord,
	getWords,
	validateNodeBelongsToCourse,
	validateUserHasAccessToCourse
};