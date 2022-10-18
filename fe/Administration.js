class AdministrationUserForm extends ValidateChangesFormDialog {
	beforeRender() {
		this.data ??= {};
		this.submitText =  i18n._(this.data.id ? 'save' :'add_user');
		this.title =  i18n._(this.data.id ? 'edit_user' : 'add_user');
		this.allowCloseButton = true;
	}

	updateActiveField(active) {
		const binarySwitch = this.form.children.find(ch => ch.name === 'active')
		binarySwitch.textContent = i18n._('user_is') + i18n._(active ? 'active' : 'deactivated');
	}

	renderActivnessField(active) {
		return {
			class: BinarySwitchField,
			label: i18n._('user_is') + i18n._(active ? 'active' : 'deactivated'),
			'on:change': () => this.updateActiveField(!active),
			name: 'active',
			value: active
		};
	}

	getFormFields() {
		return [this.renderActivnessField(this.data.id ? this.data.active : true), {
			nodeName: 'h5',
			textContent: i18n._('user_info')
		},{
			name: 'role',
			label: i18n._('role'),
			class: SelectField,
			value: this.data.role,
			defaultValue: this.data.role || 'USER',
			options: [{
				value: 'USER',
				text: i18n._('user')
			},{
				value: 'ADMIN',
				text: i18n._('admin')
			}]
		},{
			class: TextField,
			name: 'name',
			label: i18n._('name'),
			autocomplete: 'given-name',
			value: this.data.name
		},{
			class: TextField,
			name: 'surname',
			label: i18n._('lastname'),
			autocomplete: 'family-name',
			value: this.data.surname
		},{
			class: TextField,
			name: 'email',
			label: i18n._('email_address'),
			autocomplete: 'username',
			value: this.data.email
		},{
			nodeName: 'h5',
			textContent: i18n._('change_password')
		},{
			class: PasswordTextField,
			name: 'password',
			required: !this.data.id,
			label: i18n._('password'),
			autocomplete: 'new-password'
		}]
	}

	async onSave(user) {
		const userCreated = await REST.POST(!this.data?.id ? 'users/create' : `users/user-edit/${this.data.id}`, user);

		this.fire('success', userCreated);
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			404: i18n._('role_not_found'),
			409: i18n._('username_is_already_taken')
		}[ex.status]);
	}
}

class UsersSection extends Sword {
	async render() {
		const me = this;

		this.el = this.createElement({
			className: 'panel-container',
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h4',
					textContent: i18n._('users')
				},{
					nodeName: 'button',
					type: 'button',
					children: ['icon:plus', {textContent: i18n._('add_user')}],
					className: 'primary icon-left',
					'on:click': () => new AdministrationUserForm(document.body, {
						'on:success': (obj, user) => {
							me.users.push(user);
							me.table.setData(me.users);
						}
					})
				}]
			},{
				class: SmartTable,
				ref: 'table',
				getColumns: () => {
					return [{
						name: i18n._('user'),
						formatCell(table, td, v, row) {
							td.textContent = row.name + ' ' + row.surname;
							td.classList.toggle('text-muted', !row.active);
						},
					}, {
						name: i18n._('role'),
						id: 'role',
						formatCell(table, td, v, row) {
							table.append({
								textContent: v.charAt(0) + v.slice(1).toLowerCase(),
								className: 'tag tag-' + v.toLowerCase(),
							}, null, td);
						},
					},{
						name: i18n._('state'),
						id: 'active',
						formatCell(table, td, v, row) {
							table.append({
								children: [table.useIcon(row.active ? 'check' : 'cross'), {textContent: i18n._(row.active ? 'active_capital' : 'deactivated_capital')}],
								className: 'tag ' + ( row.active ? 'tag-active' : 'tag-inactive' ),
							}, null, td);
						}
					}, {
						id: 'ctl',
						formatCell(table, td, v, row) {
							table.append({
								nodeName: 'button',
								type: 'button',
								children: [table.useIcon('pencil')],
								className: 'secondary icon-only small',
								title: i18n._('edit'),
								'on:click': () => new AdministrationUserForm(document.body, {
									data: row,
									'on:success': (obj, user) => {
										const idx = me.users.findIndex(u => u.id === user.id);
										me.users[idx] = user;
										me.table.setData(me.users);
									}
								})
							}, null, td);
						}
					}]
				}
			}]
		}, this);

		this.users = await REST.GET('users/list?role=USER&role=ADMIN');
		this.table.setData(this.users);
	}
}


class LanguageAdministrationForm extends ValidateChangesFormDialog {
	beforeRender() {
		this.data ??= {};
		this.submitText =  i18n._(this.data.id ? 'save' :'add_language');
		this.title =  i18n._(this.data.id ? 'edit_language' : 'add_language');
		this.allowCloseButton = true;
	}

	getFormFields() {
		return [{
			class: TextField,
			name: 'name',
			label: i18n._('name'),
			value: this.data.name,
			autofocus: true
		},{
			class: TextField,
			name: 'code',
			label: i18n._('code'),
			value: this.data.code,
			maxLength: 4
		}]
	}

	async onSave(lang) {
		const language = await REST[this.data?.id ? 'PUT' : 'POST'](`languages${!this.data?.id ? '' : '/' + this.data.id}`, lang);

		this.fire('success', language);
	}

	handleError(ex) {
		let msg = {
			404: i18n._('language_not_found')
		}[ex.status]

		if (ex.status === 409) {
			msg = ex.code === 'lang_name' ? i18n._('language name is already taken') : i18n._('language code is already taken');
		}

		NOTIFICATION.showStandardizedError(msg);
	}
}

class LanguagesSection extends Sword {
	async render() {
		const me = this;

		this.el = this.createElement({
			className: 'panel-container',
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h4',
					textContent: i18n._('languages')
				},{
					nodeName: 'button',
					type: 'button',
					children: ['icon:plus', {textContent: i18n._('add_language')}],
					className: 'primary icon-left',
					'on:click': () => new LanguageAdministrationForm(document.body, {
						'on:success': (obj, lang) => {
							me.languages.push(lang);
							me.table.setData(me.languages);
						}
					})
				}]
			},{
				class: SmartTable,
				ref: 'table',
				getColumns: () => {
					return [{
						name: i18n._('name'),
						id: 'name'
					}, {
						name: i18n._('code'),
						id: 'code'
					},{
						id: 'ctl',
						formatCell(table, td, v, row) {
							table.append(table.createEditButton(LanguageAdministrationForm, row), null, td);
						}
					}]
				}
			}]
		}, this);

		this.languages = await REST.GET('languages/list');
		this.table.setData(this.languages);
	}
}


class Administration extends SectionScreen {
	beforeRender() {
		this.defaultSection = Routes.administration_languages;
	}

	getRoutes() {
		const routes = {
			languages: Routes.administration_languages
		};

		if (DataManager.userIsAdmin()) {
			routes["users"] = Routes.administration_users;
		}

		return routes
	}

	getSidebarMenu() {
		return [{
			render: DataManager.userIsAtLeastEditor(),
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('book'), i18n._('languages')],
			href: Routes.administration_languages,
			screen: LanguagesSection
		},{
			render: DataManager.userIsAdmin(),
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('users'), i18n._('users')],
			href: Routes.administration_users,
			screen: UsersSection
		}]
	}

	getHeader() {
		return {
			nodeName: 'nav',
			className: 'header',
			children: [{
				className: 'page-centered-container',
				children: [{
					class: AppLogo,
				},{
					className: 'tab-switcher',
					children: [{
						class: NavigationLink,
						text: i18n._('admin'),
						href: Routes.administration,
						activeOnRoutes: [Routes.administration_languages, Routes.administration_users, Routes.administration]
					}]
				}, {
					class: UserProfile
				}],
			}],
		}
	}
}