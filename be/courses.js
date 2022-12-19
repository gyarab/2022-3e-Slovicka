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
		throw new NotFound('Course does not exist', 'course_not_found');
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
	const course = await validateCourseIsUSERType(courseId);

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

	return (await db.runQuery(`
        SELECT gr.id AS group, wo.word, wo.id, wo.language, COALESCE(gr.definition, wo.definition) AS definition,
               COALESCE(gr.translation, wo.translation) AS translation, COALESCE(gr.phonetic, wo.phonetic) AS phonetic,
               COALESCE(gr.sentence, wo.sentence) AS sentence, known_times, ws.state
            FROM word_groups AS gr
			INNER JOIN words AS wo ON gr.word = wo.id
			LEFT JOIN word_state AS ws ON ws.word_group = gr.id AND ws."user" = ?
			LEFT JOIN (
	            SELECT MAX(changed), count(CASE when state = 'known' then 1 end) AS known_times, word_group FROM word_state
	            WHERE "user" = ? GROUP BY ("user", "word_group")
	        ) states ON states.word_group = gr.id
        WHERE course_node = ? AND
            (case when ws.state IS NULL THEN TRUE ELSE ws."user" = ? AND changed = states.max END);
	`, [req.session.id, req.session.id, node, req.session.id]));
}

async function getCourseWithRootNode(id, sessionId) {
	const course = await db.select()
		.fields('courses.*, cr.value AS rating')
		.from('courses', `LEFT JOIN course_ratings AS cr ON cr.course = courses.id AND cr."user" = ${sessionId}`)
		.whereId(id)
		.oneOrNone();

	const node = await db.select('course_nodes')
		.from(
			'course_nodes',
			`LEFT JOIN (SELECT SUM(cns.number_of_completion)::int AS number_of_completion, course_nodes FROM course_node_state AS cns
		       WHERE cns."user" = ${sessionId} GROUP BY "user", course_nodes
	        ) AS states ON states.course_nodes = course_nodes.id`
		)
		.where('course = ?', id)
		.oneOrNone();

	return {
		...course,
		node: node.id,
		number_of_completion: node.number_of_completion
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

function prepareCoursesRatingsInteractionsQuery(userId, query, {withRatings, orderByInteractions, limit}) {
	if (withRatings) {
		query
			.fields('AVG(cr.value)::numeric(2, 1) AS rating')
			.from('LEFT JOIN course_ratings AS cr ON cr.course = courses.id');
	}

	if (orderByInteractions) {
		query
			.from(
				`LEFT JOIN last_course_interaction AS lci ON lci.course = courses.id AND "user" = ${userId}`
			)
			.where('(lci.interaction IS NULL OR lci.interaction = (SELECT MAX(interaction) FROM last_course_interaction WHERE course = courses.id AND "user" = ?))', userId)
			.more('ORDER BY lci.interaction DESC NULLS LAST');
	}

	if (limit) {
		query.more('LIMIT ?', limit)
	}

	return query;
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
	return await getCourseWithRootNode(id, req.session.id);
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
	const sessionId = req.session.id;

	await validateUserHasAccessToCourse(id, sessionId);
	return await getCourseWithRootNode(id, sessionId);
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
	const orderByInteractions = Boolean(req.query.interactions) === true;
	const limit = req.query.limit && parseId(req.query.limit);
	const withWordCount = Boolean(req.query.withWordCount) === true;

	const query = db.select()
		.from(
			'courses',
			'INNER JOIN course_nodes AS cn ON cn.course = courses.id'
		)
		.fields('courses.*, cn.id AS node');

	prepareCoursesRatingsInteractionsQuery(req.session.id, query, {
		limit,
		orderByInteractions,
		withRatings
	});

	if (withWordCount) {
		query.from('LEFT JOIN word_groups AS wg ON wg.course_node = cn.id').fields('COUNT(wg.*)::int AS words');
	}

	if (withRatings) {
		query.more('GROUP BY courses.id, cn.id')
	}

	if (editable) {
		query.where('owner = ?', req.session.id);
	} else {
		query.where(
			'((visible_to = ? AND courses.state = ?) OR (owner = ? AND visible_to = ?))',
			'EVERYONE', 'published', req.session.id, 'ME');
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

async function validateUserHasAccessToAdventureNode(courseId, level, sessionId) {
	const nodes = await db.select()
		.from('course_nodes AS cn',
			`LEFT JOIN (SELECT SUM(cns.number_of_completion)::int AS completed, course_nodes FROM course_node_state AS cns
		       WHERE cns."user" = ${sessionId} GROUP BY "user", course_nodes
	        ) AS states ON states.course_nodes = cn.id`
		)
		.fields('cn.number_of_completion AS required, states.completed')
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

		return {course, node};
	} else {
		if (course.state !== 'published' || node.state === 'creating') {
			throw new Unauthorized();
		}

		if (node.level > 0) {
			await validateUserHasAccessToAdventureNode(courseId, node.level, userId);
		}

		return {course, node};
	}
}

app.get_json('/courses/:id([0-9]+)/nodes/:node([0-9]+)/words', async req => await getWords(req, async (nodeId, courseId, userId) => {
	await validateUserHasAccessToNode(courseId, nodeId, userId);
}));

app.post_json('/courses/:id([0-9]+)/words/:group([0-9]+)/state', async req => {
	const id = parseId(req.params.id);
	const groupId = parseId(req.params.group);
	const {state} = req.body;

	validateStringNotEmpty(state, 'State');

	if (state !== 'known' && state !== 'unknown') {
		throw new NotFound('State', 'state_not_found')
	}

	const group = await validateWordGroupExists(groupId);
	await validateUserHasAccessToNode(id, group.course_node, req.session.id);

	const course = await db.oneOrNoneById('courses', id);

	if (course.type === courseTypes.ADVENTURE.description) {
		const numberOfCompletions = (await db.select()
			.fields('SUM(cns.number_of_completion)::int AS number_of_completion')
			.from(
				'course_node_state AS cns',
				'INNER JOIN course_nodes cn on cn.id = cns.course_nodes'
			)
			.where('cns."user" = ?', req.session.id)
			.where('cn.id = ?', group.course_node)
			.more('GROUP BY "user", cn.id')
			.oneOrNone())?.number_of_completion || 0;

		const numberOfCompletionOfWord = Number((await db.select()
			.fields('COUNT(*)::int AS word_completion')
			.from(
				'word_state',
				'INNER JOIN word_groups wg on wg.id = word_state.word_group',
				'INNER JOIN course_nodes cn on cn.id = wg.course_node and cn.id = wg.course_node'
			)
			.where('"user" = ?', req.session.id)
			.where('cn.id = ?', group.course_node)
			.where('word_group = ?', groupId)
			.where('word_state.state = ?', 'known')
			.oneOrNone())?.word_completion || 0);

		if (numberOfCompletionOfWord !== numberOfCompletions) {
			throw new BadRequest('Cannot complete same word again', 'inserting_same_word');
		}
	}

	return await db.insert('word_state', {
		state,
		"user": req.session.id,
		word_group: groupId
	})
		.oneOrNone();
});

app.post_json('/courses/:id([0-9]+)/ratings', async req => {
	const id = parseId(req.params.id);
	const {rating} = req.body;
	validateType(rating, 'number');

	const course = await validateCourseExists(id);

	if (course.type === courseTypes.USER.description) {
		if (!(course.owner === req.session.id || course.visible_to === 'EVERYONE' && course.state === 'published')) {
			throw new Unauthorized();
		}
	} else {
		if (course.state !== 'published') {
			throw new Unauthorized();
		}
	}

	if (!Number.isInteger(rating)) {
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
	validateUserHasAccessToCourse,
	prepareCoursesRatingsInteractionsQuery,
	validateUserHasAccessToNode
};