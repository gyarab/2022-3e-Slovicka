const nodemailer = require("nodemailer");
const env = require('../env.js');
const fs = require("fs");

class Mailer {
	/**
	 * Key of variable and value for replacement in html
	 */
	replacements = {};

	constructor() {
		if (!env.mailer.smtp_host) {
			throw new Error('Mailer is not configured');
		}

		this.transporter = nodemailer.createTransport({
			host: env.mailer.smtp_host,
			port: 465,
			secure: true,
			auth: {
				user: env.mailer.email,
				pass: env.mailer.password
			},
		});
	}

	async sendMail(htmlName, subject, to) {
		const htmlEdited = await this.getEmailHtml(htmlName);

		let info = await this.transporter.sendMail({
			from: `"Team ${env.title}" ${env.mailer.email}`,
			to: to,
			subject: subject,
			html: htmlEdited
		});

		console.log("Message sent: %s", info.messageId);
	}

	setReplacements(replacements) {
		this.replacements = replacements;
	}

	async getEmailHtml(htmlName) {
		const html = fs.readFileSync(`be/templates/${htmlName}.html`)
		return this.replaceVariablesWithValues(html.toString());
	}

	replaceVariablesWithValues(html) {
		for (const [k, v] of Object.entries(this.replacements)) {
			const regex = new RegExp('\\${' + k + '}', 'g')
			html = html.replace(regex, v);
		}
		return html;
	}
}

const mailer = new Mailer();

module.exports = mailer;