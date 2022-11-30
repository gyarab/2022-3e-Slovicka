const {express, BadRequest} = require("./utils/aexpress");
const SQLBuilder = require('./utils/SQLBuilder');
const {parseId} = require("./utils/utils");
const {validateUserHasAccessToCourse} = require("./courses");

const app = express();
const db = new SQLBuilder();

const validateValidDate = date => {
	if (!(date instanceof Date && !isNaN(date))) {
		throw new BadRequest('Invalid date', 'invalid_date');
	}
};

app.get_json('/statistics/words_known', async req => {
	let from = req.query.from ? new Date(req.query.from) : new Date(0), to = req.query.to;

	validateValidDate(from);

	if (to) {
		validateValidDate(to);
	}

	to ??= new Date();

	return Number((await db.select('word_state')
		.fields('COUNT(*)')
		.where('"user" = ?', req.session.id)
		.where('state = ?', 'known')
		.where('changed >= ?', from)
		.where('changed <= ?', to)
		.oneOrNone()).count);
});

app.get_json('/statistics/daystreak', async req => {
	return (await db.runQuery(`
		WITH dates AS (
			SELECT DISTINCT at::date created_date FROM user_interactions WHERE "user"="${req.session.id}" AND event = 'LOGIN'
		),
		date_groups AS (
			SELECT
				created_date,
				created_date::DATE - CAST(row_number() OVER (ORDER BY created_date) as INT) AS grp
			FROM dates
		)
		SELECT max(created_date) - min(created_date) + 1 AS length
		FROM date_groups
		GROUP BY grp
		ORDER BY length DESC
		LIMIT 1`
	))?.length || 0;
});

app.get_json('/statistics/learning_time', async req => {
	const courseId = req.query.course && parseId(req.query.course);

	if (courseId) {
		await validateUserHasAccessToCourse(courseId, req.session.id);
	}

	const query = db.select(`course_study_time`)
		.fields('SUM("to" - "from") AS learning')
		.where('"user" = ?', 1);

	if (courseId) {
		query.where('course = ?', courseId)
	}

	return (await query.oneOrNone()).learning;
})

module.exports = {app};