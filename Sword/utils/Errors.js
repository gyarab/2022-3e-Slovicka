class Errors {
	standardizedError = {
		duration: 7000,
		type: NOTIFICATIONTYPES.ERROR
	};

	errors = {
		"Wrong credentials": "Je nám líto, ale váš email nebo heslo nejsou správné",
		'E-mail address is not valid': 'Emailová adresa není validní',

	};

	resolveErrorText(ex, ignoreMsgNotFound, showStandardizedError) {
		const msg = this.errors[ex.detail];

		if (!msg && !ignoreMsgNotFound) {
			let err = {
				columnNumber: ex.columnNumber,
				fileName: ex.fileName,
				lineNumber: ex.lineNumber,
				message: ex.message,
				stack: ex.stack
			};

			NOTIFICATION.copyableErrorNotification(JSON.stringify(err));
		}

		if (showStandardizedError && msg) {
			NOTIFICATION.notify({
				message: msg,
				...this.standardizedError
			})
		}

		return msg;
	}
}