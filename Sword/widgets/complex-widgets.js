class InviteWorkspaceMemberInput extends Sword {
	emails = {}

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				className: 'body',
				children: [{
					className: 'input-whole',
					'on:click': () => this.input.focus(),
					children: [{
						ref: 'emailsList',
						className: 'email-list',
					},{
						className: 'input-editable',
						contenteditable: true,
						placeholder: 'Search existing or invite new members by email',
						ref: 'input',
						'on:keyup': () => {
							const email = this.input.textContent;

							if (email.length > 0) {
								this.renderSuggestions(email)
							} else {
								this.suggestions.innerHTML = '';
							}
						},
						'on:keydown': e => {
							const email = this.input.textContent;

							if (email.trim().length > 0 && (e.code === 'Space' || e.code === 'Comma' || e.code === 'Enter')) {
								e.preventDefault();
								this.addUserInvite(email);

								// Because of enter triggering dialog
								e.stopPropagation();
							}
						}
					}, {
						ref: 'suggestions',
						className: 'suggestions-container',
					}]
				},{
					nodeName: 'button',
					type: 'button',
					className: 'primary icon-left',
					children: [this.useIcon('userplus'), { textContent: 'Invite' }],
					'on:click': () => this.doInvite()
				}]
			},{
				ref: 'message',
				children: [{
					textContent: 'Invite more users by separating them with a comma'
				}]
			}]
		}, this);
	}

	async connect() {
		this.input.focus();

		this.users = await REST.GET(`topics/members/suggestions`)
		const topicMembers = await REST.GET(`topics/${this.topic}/members`);

		const alreadyAddedUsersM = {};

		for (const u of topicMembers) {
			alreadyAddedUsersM[u.id] = u;
		}

		this.users = this.users.filter(u => !alreadyAddedUsersM[u.id]);
	}

	userAlreadyAdded(email) {
		return !!this.emails[email];
	}

	addUserInvite(email) {
		if (this.userAlreadyAdded(email)) {
			NOTIFICATION.showStandardizedINFO('This user has already been added');
			return;
		}

		this.fire('changes', true);
		this.emails[email] = email;
		this.input.textContent = '';

		const emailEl = this.append({
			className: 'email',
			children: [{
				className: 'email-address',
				textContent: email
			},{
				nodeName: 'button',
				type: 'button',
				className: 'transparent xs icon-only',
				children: [this.useIcon('cross')],
				'on:click': () => {
					emailEl.remove();
					delete this.emails[email];
					if (Object.keys(this.emails).length === 0) {
						this.fire('changes', false);
					}
				}
			}]
		}, null, this.emailsList)
	}

	renderSuggestions(text) {
		this.suggestions.innerHTML = '';

		const textRgx = new RegExp(text, 'i')
		const users = this.users.filter(u => textRgx.test(u.name + u.email) && !this.emails[u.email]);

		for (const u of users) {
			const s = this.append({
				'on:click': () => {
					this.addUserInvite(u.email)
					s.remove();
					this.suggestions.innerHTML = '';
				},
				className: 'user-container',
				children: [ this.useIcon('user'), {
					className: 'info',
					children: [{
						className: 'user-name',
						textContent: u.name + ' ' + u.surname,
					}, {
						className: 'user-email',
						textContent: u.email,
					}]
				}]
			}, null, this.suggestions);
		}
	}

	async doInvite() {
		try {
			const inputNotEmpty = this.input.textContent;

			if (inputNotEmpty) {
				this.addUserInvite(inputNotEmpty);
			}

			if (this.validateEmails()) {
				return;
			}

			this.emailsList.innerHTML = '';
			this.fire('changes', false);

			const keys = Object.keys(this.emails);

			DataManager.inviteMembers(this.topic, keys);
			this.setStandardMessage();
			this.emails = {};
			this.suggestions.innerHTML = '';
			this.input.textContent = '';
		} catch (ex) {
			NOTIFICATION.showStandardizedError({
				409: 'Invites contain same user more than once.'
			}[ex.status])
		}
	}

	getEmailCount() {
		return Object.keys(this.emails).length;
	}

	validateEmails() {
		let invalid = false;

		for (const ch of this.emailsList.children) {
			if (!TextUtils.validators.email.test(ch.textContent)) {
				ch.classList.add('invalid');
				invalid = true;
			}
		}

		if (invalid) {
			this.setMessage('Enter valid email address');
		} else {
			this.setStandardMessage();
		}

		return invalid;
	}

	setStandardMessage() {
		this.setMessage('Invite more users by separating them with a comma', null);
	}

	setMessage(text, icon='warning-circle-filled') {
		this.message.innerHTML = '';

		this.append({
			className: 'invalid-input',
			children: [icon ? this.useIcon(icon) : null, {
				textContent: text
			}]
		}, null, this.message);
	}
}