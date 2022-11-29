const {express, BadRequest} = require("./utils/aexpress");
const SQLBuilder = require('./utils/SQLBuilder');

const app = express();
const db = new SQLBuilder();

const validateValidDate = date => {
	if (!(date instanceof Date && !isNaN(date))) {
		throw new BadRequest('Invalid date', 'invalid_date');
	}
};

app.get_json('/statistics/words_known', async req => {
	let from = new Date(req.query.from), to = req.query.to;

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
	)).length;
})

module.exports = {app};