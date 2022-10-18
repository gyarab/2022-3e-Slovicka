const sgMail = require('@sendgrid/mail');
const ENV = require('../env');
const {ApiError} = require("../utils/aexpress");

class SendgridMailer {
	constructor() {
		if (!ENV.sendgrid.api_key) {
			throw new Error('Sendgrid api key is not configured');
		}

		sgMail.setApiKey(ENV.sendgrid.api_key);
	}

	async sendEmail(templateId, to, templateData = {}) {
		const msg = {
			to: to,
			from: ENV.mailer.email,
			templateId: templateId,
			dynamicTemplateData: templateData
		}

		try {
			await sgMail.send(msg)
			console.log("Message sent to: %s", to);
		} catch (ex) {
			console.error(ex);
			throw new ApiError(400, 'Email cannot be send');
		}
	}
}

module.exports = new SendgridMailer();