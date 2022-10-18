function backToLoginLink(text) {
	return {
		children: [{
			nodeName: 'span',
			className: 'text-muted',
			textContent: !text ? i18n._('already_have_an_account') : i18n._(text)
		},{
			class: NavigationLink,
			href: Routes.login,
			text: i18n._('login')
		}]
	}
}

class LoginForm extends Form {
	beforeRender() {
		this.subtitle = i18n._('login_title');
		this.submitText = i18n._('login');
		this.className = 'form-reduced-width';
	}

	getFormFields() {
		return [{
			class: TextField,
			name: 'email',
			type: 'text',
			label: i18n._('email_address'),
			autocomplete: 'username',
		}, {
			class: PasswordTextField,
			name: 'password',
			enforcePasswordRules: false,
			label: i18n._('password'),
			autocomplete: 'current-password'
		}];
	}

	async onSave(data) {
		await DataManager.login(data);
		ROUTER.replaceRoute(Routes.home);
	}

	handleError(ex) {
		let msg = ex.detail || '';

		if (ex.status === 401 || ex.status === 404) {
			msg = i18n._(`incorrect_email_or_password`);
		} else if (msg === 'E-mail address is not valid') {
			msg = i18n._("email_address_is_not_valid");
		} else if (ex.message === 'User is not verified') {
			msg = i18n._('email_address_havent_been_verified')
		} else {
			msg = i18n._('something_went_wrong');
		}

		this.showError(msg);
	}

	getButtons() {
		return [{
			nodeName: 'button',
			type: 'submit',
			className: 'primary button-block',
			textContent: i18n._('login')
		}]
	}

	getLinks() {
		return [{
			children: [{
				nodeName: 'span',
				textContent: i18n._('dont_have_an_account')
			},{
				class: NavigationLink,
				href: Routes.signup,
				text: i18n._('sign_up')
			}]
		},{
			class: NavigationLink,
			href: Routes.forgotten_password,
			text: i18n._('forgot_your_password')
		}]
	}
}

class SignupForm extends Form {
	beforeRender() {
		this.subtitle = i18n._('sign_up');
		this.submitText = i18n._('create_account');
		this.className = 'form-reduced-width';
	}

	getFormFields() {
		return [{
			class: TextField,
			name: 'email',
			type: 'text',
			label: i18n._('email_address'),
			autocomplete: 'username',
		},{
			class: TextField,
			name: 'name',
			type: 'text',
			label: i18n._('your_name'),
			autocomplete: 'first-name',
		},{
			class: TextField,
			name: 'surname',
			type: 'text',
			label: i18n._('lastname'),
			autocomplete: 'last-name',
		},{
			class: PasswordTextField,
			name: 'password',
			enforcePasswordRules: false,
			label: i18n._('password'),
			autocomplete: 'new-password'
		},{
			required: true,
			class: AckCheckboxField,
			getLabelContent() {
				return [{
					nodeName: 'span',
					textContent: i18n._('i_agree_to_the')
				},{
					nodeName: 'a',
					target: '_blank',
					href: Routes.privacy_policy,
					textContent: i18n._('privacy_policy'),
				},{
					nodeName: 'span',
					textContent: i18n._('and')
				},{
					nodeName: 'a',
					target: '_blank',
					href: Routes.terms_of_service,
					textContent: i18n._('terms_of_service'),
				}]
			}
		}];
	}

	async onSave(data) {
		const user = await REST.POST('users/signup', data);

		if (!user.verified) {
			APP.show({
				class: AccountActivationResend,
				email: data.email
			})
		} else {
			ROUTER.pushRoute(Routes.login);
		}
	}

	handleError(ex) {
		const exMsg = ex.detail || '';

		if (ex.status === 409) {
			this.showError(i18n._("email_address_is_already_taken"));
		} else if (exMsg === "E-mail address is not valid") {
			this.showError(i18n._('email_address_is_not_valid'));
		} else {
			this.showError(i18n._('something_went_wrong'));
		}
	}

	getButtons() {
		return [{
			nodeName: 'button',
			type: 'submit',
			className: 'primary button-block',
			textContent: i18n._('create_account'),
		}]
	}

	getLinks() {
		return [backToLoginLink()]
	}
}

class AccountActivationResend extends Sword {
	render() {
		this.el = this.createElement({
			className: 'form',
			children: [{ className: 'form-icon', children: [this.useIcon('envelope')]},{
				nodeName: 'h5',
				textContent: i18n._('please_verify_your_email_address'),
				className: 'form-title',
			}, {
				textContent: i18n._('check_your_email_inbox_for_a_verification_email'),
				className: 'form-subtitle',
			},{
				nodeName: 'hr',
			},{
				className: 'form-links',
				children: [{
					children: [{
						nodeName: 'span',
						textContent: i18n._('didnt_receive_email') + ' ',
						className: 'text-muted',
					},{
						nodeName: 'button',
						textContent: i18n._('resend_email'),
						className: 'transparent',
						'on:click': async () => {
							try {
								await REST.POST('users/resend-activation-email', {
									email: this.email
								})
							} catch (ex) {
								NOTIFICATION.showStandardizedError({
									400: i18n._('user_was_not_found'),
									404: i18n._('user_is_already_verified')
								}[ex.status] || i18n._('something_went_wrong'));
							}
						}
					}]
				},backToLoginLink('Back to ')]
			}]
		})
	}
}

class ForgottenPasswordForm extends Form {
	beforeRender() {
		this.subtitle = i18n._('forgotten_password');
		this.subtitleLabel = i18n._('for_password_recovery_enter_email_you_signed_with');
		this.className = 'form-reduced-width';
	}

	getButtons() {
		return [{
			nodeName: 'button',
			type: 'submit',
			className: 'primary button-block',
			textContent: 'Resetovat heslo',
		}]
	}

	getLinks() {
		return [backToLoginLink('Back to ')];
	}

	getFormFields() {
		return [{
			class: TextField,
			name: 'email',
			type: 'email',
			label: i18n._('email_address'),
			autocomplete: 'username',
		}];
	}

	async onSave(data) {
		await REST.POST('users/restore-password', data);

		APP.show({
			class: ForgottenPasswordEmailSentScreen
		})
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			400: i18n._('email_address_of_this_user_is_not_verified'),
			404: i18n._('user_not_found')
		}[ex.status]);
	}
}

class ForgottenPasswordEmailSentScreen extends Sword {
	render() {
		this.el = this.createElement({
			className: 'form',
			children: [{ className: 'form-icon', children: [this.useIcon('envelope')]}, {
				nodeName: 'h5',
				textContent: i18n._('check_your_inbox'),
				className: 'form-title',
			},{
				textContent: i18n._('email_with_recovery_link_sent'),
				className: 'form-subtitle',
			},{
				className: 'form-links',
				children: [backToLoginLink('Back to ')]
			}]
		})
	}
}

class PasswordRestoreForm extends Form {
	beforeRender() {
		this.subtitle = i18n._('create_your_new_password');
		this.submitText = i18n._('confirm');
		this.className = 'form-reduced-width';
	}

	getButtons() {
		return [{
			nodeName: 'button',
			type: 'submit',
			className: 'primary button-block',
			textContent: i18n._('confirm'),
		}]
	}

	getFormFields() {
		return [{
			class: PasswordTextField,
			name: 'password',
			label: i18n._('new_password'),
			autocomplete: 'new-password',
		}];
	}

	async onSave(data) {
		await REST.POST('users/complete-restore-password', {
			token: this.token,
			password: data.password
		});

		ROUTER.pushRoute(Routes.login);
		NOTIFICATION.showStandardizedSuccess(i18n._('new_password_is_ready_you_can_log_in_now'))
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			'User is not activated': i18n._('email_address_of_this_user_is_not_verified'),
			'Invalid token': i18n._('invalid_token')
		}[ex.message]);
	}
}

class TermsOfServiceIllustrative extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				nodeName: 'h3',
				textContent: i18n._('terms_of_service')
			},{
				textContent: i18n._('terms_of_service_content')
			}]
		})
	}
}
class PrivacyPolicyIllustrative extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				nodeName: 'h3',
				textContent: i18n._('privacy_policy')
			},{
				textContent: i18n._('privacy_policy_content')
			}]
		})
	}
}