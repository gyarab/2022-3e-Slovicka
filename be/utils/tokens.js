const SQLBuilder = require("./SQLBuilder.js");
const {random_bytes} = require("./utils.js");
const {ApiError} = require("./aexpress.js");

const db = new SQLBuilder();

class Tokens {
	async checkToken(tokenCode) {
		return await db.select('tokens')
			.where('code = ?', tokenCode)
			.where("(expiration IS NULL OR expiration > now())")
			.oneOrNone();
	}

	async createToken(token) {
		const code = (await random_bytes(24)).toString('hex');

		const date = new Date();
		date.setDate(date.getDate() + token.expiration);

		return await db.insert('tokens', {
			code,
			purpose: token.purpose,
			expiration: date.toISOString().split('T')[0],
			user: token.user
		})
		.oneOrNone();
	}

	async cancelToken(tokenCode) {
		await db.delete('tokens')
			.where('code = ?', tokenCode)
			.run();
	}

	async cancelAllUserTokens(user) {
		await db.delete('tokens')
			.where('"user" = ?', user)
			.run();
	}

	async verifyToken(tokenCode, purpose) {
		const token = await tokens.checkToken(tokenCode);

		if (!token) {
			throw new ApiError(400, 'Bad token');
		}

		if (token.purpose !== purpose) {
			throw new ApiError(400, 'Bad token');
		}

		return token;
	}

	async getTokenByPurposeAndUser(user, purpose) {
		return await db.select('tokens')
			.where('"user" = ?', user)
			.where('purpose = ?', purpose)
			.oneOrNone();
	}
}
const tokens = new Tokens();
module.exports = tokens;