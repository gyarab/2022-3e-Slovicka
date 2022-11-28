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

module.exports = {app};