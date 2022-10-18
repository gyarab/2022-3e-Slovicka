const NOTIFICATIONTYPES = {
	INFO: 'info',
	WARNING: 'warning',
	SUCCESS: 'success',
	ERROR: 'error',
	MESSAGE: 'message'
}

class Notifications extends Sword {
	notifications = [];
	activeNotification = null;

	render() {
		this.el = this.createElement({})
	}

	/**
	 *
	 *
	 * @param {string} data.message
	 * @param {boolean} data.disableClose
	 * @param {number} data.duration
	 * @param {NOTIFICATIONTYPES} data.type
	 * @param {boolean} data.force
	 * @param {array} data.children
	 */
	notify(data) {
		if (data.force) {
			this.removeNotification(this.activeNotification);
		}

		const iconName = this.getNotificationTypeIcon(data.type);

		const notification = this.append({
			className: `notify-bar`,
			'data-kind': data.type,
			children: [{
				className: 'status-icon',
				children: [this.useIcon(iconName)]
			}, {
				className: 'text',
				textContent: data.message,
				children: data.children
			},{
				nodeName: 'a',
				href: '#',
				className: 'close',
				render: !data.disableClose,
				children: [this.useIcon('close')],
				'on:click': e => {
					e.preventDefault();
					this.removeNotification(notification)
				}
			}]
		})

		let nb = notification.getBoundingClientRect();

		Object.assign(notification.style, {
			left: ((window.innerWidth - nb.width) / 2) + 'px',
			'z-index': 1000000
		});

		this.notifications.push(notification);
		this.activeNotification = notification;

		setTimeout(() => {
			if (notification.isConnected) {
				this.removeNotification(notification)
			}
		}, data.duration);
	}

	removeNotification(notification) {
		const idx = this.notifications.indexOf(notification);
		this.notifications.splice(idx, 1);
		notification.remove();
	}

	clearAll() {
		for (const n of this.notifications) {
			this.removeNotification(n);
		}
	}

	getNotificationTypeIcon(type) {
		switch (type) {
			case NOTIFICATIONTYPES.ERROR:
				return 'error';
			case NOTIFICATIONTYPES.WARNING:
				return 'warningtriangle';
			case NOTIFICATIONTYPES.MESSAGE:
				return 'message';
			case NOTIFICATIONTYPES.INFO:
				return 'info';
			case NOTIFICATIONTYPES.SUCCESS:
				return 'check';
			default:
				return null;
		}
	}

	copyableErrorNotification(text) {
		this.notify({
			type: NOTIFICATIONTYPES.ERROR,
			duration: 10000,
			children: [{
				textContent: `Neznámá chyba. Prosím klikněte na ikonu kopie a předejte zkopírovaný kód administrátorovi`
			},{
				children: [this.useIcon('bug')],
				'on:click': async () => {
					await Utils.copyToClipboard(text);
					this.removeNotification(this.activeNotification);
					this.notify({
						type: NOTIFICATIONTYPES.SUCCESS,
						message: 'Chyba byla zkopírována',
						duration: 3000
					})
				}
			}]
		})
	}

	showStandardizedSuccess(message) {
		this.#showStandardizedNotification(message, NOTIFICATIONTYPES.SUCCESS);
	}

	showStandardizedError(message) {
		if (!message) {
			message = i18n._('something_went_wrong');
		}

		this.#showStandardizedNotification(message, NOTIFICATIONTYPES.ERROR);
	}

	showStandardizedWarning(message) {
		this.#showStandardizedNotification(message, NOTIFICATIONTYPES.WARNING);
	}

	showStandardizedINFO(message) {
		this.#showStandardizedNotification(message, NOTIFICATIONTYPES.INFO);
	}

	showStandardizedMessage(message) {
		this.#showStandardizedNotification(message, NOTIFICATIONTYPES.MESSAGE);
	}

	#showStandardizedNotification(message, type) {
		this.notify({
			message,
			type,
			duration: 5000
		})
	}
}