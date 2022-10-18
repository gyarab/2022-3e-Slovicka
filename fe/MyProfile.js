class ChangePasswordSection extends Form {
	beforeRender() {
		this.subtitle = i18n._('change_password');
		this.className = 'panel-container';
	}

	getLinks() {
		return [];
	}

	getFormFields() {
		return [{
			class: PasswordTextField,
			label: i18n._('current_password'),
			name: 'old_password',
			autocomplete: 'current-password'
		}, {
			class: PasswordTextField,
			label: i18n._('new_password'),
			name: 'new_password'
		}];
	}

	getButtons() {
		return [{
			nodeName: 'button',
			type: 'submit',
			textContent: i18n._('save_changes'),
			className: 'primary'
		}]
	}

	async onSave(data) {
		await REST.PUT('users/password-change', data);

		this.reset();
		NOTIFICATION.showStandardizedSuccess(i18n._('password_has_been_changed'));
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			401: i18n._('invalid_password')
		}[ex.status])
	}
}

class MyProfile extends SectionScreen {
	beforeRender() {
		this.defaultSection = Routes.my_profile_pass;
	}

	getRoutes() {
		return {
			"change-password": Routes.my_profile_pass
		}
	}

	getSidebarMenu() {
		return [{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('lock'), i18n._('password')],
			href: Routes.my_profile_pass,
			screen: ChangePasswordSection
		}]
	}

	getHeader() {
		return {
			class: AppHeader
		}
	}
}