class PopupMenu extends Sword {
	/**
	 * Menu options:
	 *   - iconName (use a new style SVG symbol icon)
	 *   - text
	 *   - cls
	 *   - handle
	 */
	beforeRender() {
		this.options ??= [];
	}

	render() {
		let hasIcons = this.options.some(o => !o.hidden && (o.iconName || o.rightIconName));

		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			'key_ArrowUp': () => this.focusPrev(),
			'key_ArrowDown': () => this.focusNext(),
			'key_Tab': (ev) => {
				if (ev.shiftKey) {
					this.focusPrev();
				} else {
					this.focusNext();
				}

				ev.preventDefault();
			},
			'key_Escape': () => this.destroy(),
			className: 'popup-menu popup-arrow' + (hasIcons ? '' : ' no-icons'),
			children: this.renderMenu(),
			tabIndex: '0',
			'on*:click': ev => {
				let optionEl = ev.target.closest('.option');
				if (optionEl) {
					this.onOptionClick(optionEl, ev);
				}
			},
		});

		if (!APP.isMobileUI()) {
			setTimeout(() => {
				if (this.el) {
					this.el.focus();
				}
			}, 100)
		}
	}


	setOptions(opts) {
		this.options = opts;

		this.replaceChildren(this.renderMenu())
	}

	renderOption(option, idx) {
		if (option.render) {
			return option.render;
		}

		return {
			option_index: idx,
			nodeName: 'a',
			href: option.href || '#',
			target: option.href ? '_blank' : undefined,
			'on:click': e => e.preventDefault(),
			className: 'option ' + (option.cls || ''),
			children: [{
				className: 'option-icon',
				children: [option.iconName ? this.useIcon(option.iconName) : null]
			}, {
				className: 'option-text',
				textContent: option.text,
			}, {
				render: !!option.rightIconName,
				className: 'option-icon-right',
				children: [option.rightIconName ? this.useIcon(option.rightIconName) : null]
			}, {
				render: !!option.submenu,
				className: 'option-submenu',
				children: [this.useIcon('arrow-simple-right')],
			}],
		};
	}

	renderMenu() {
		return this.options
			.filter(o => o && !o.hidden)
			.map((o, idx) => this.renderOption(o, idx));
	}

	onOptionClick(option, ev) {
		let oIdx = Number(option.getAttribute('option_index'));
		const o = this.options[oIdx];

		if (o.submenu) {
			let popup = new PopupMenu(document.body, {
				options: o.submenu,
			});

			PopupManager.show(popup, {
				anchorEl: option,
				forceAxis: 'horizontal',
				preferReadingOrder: true,
				disableMobileUIPopover: false
			});
			return;
		}

		if (o.handle) {
			ev.preventDefault();
			o.handle();
		}

		this.destroy();
	}

	focusNext() {
		let opts = this.el.querySelectorAll('.option');
		let idx = opts.findIndex(el => el.matches(':focus'));
		let next = opts[idx + 1] || opts[opts.length - 1];

		next && next.focus();
	}

	focusPrev() {
		let opts = this.el.querySelectorAll('.option');
		let idx = opts.findIndex(el => el.matches(':focus'));
		let next = opts[idx - 1] || opts[0];

		next && next.focus();
	}
}

class Dialog extends Sword {
	beforeRender() {
		this.title ??= '';
		this.subtitle ??= '';
		this.className ??= '';
		this.renderBody ??= null;
	}

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			className: 'admin-dialog-mask',
			tabIndex: '-1',
			children: [{
				ref: 'dlgEl',
				className: 'dialog',
				...this.getExtraDailogProps(),
				children: [{
					ref: 'headerEl',
					className: 'header',
					children: [{
						ref: 'titleEl',
						nodeName: 'h1',
						textContent: this.title,
					}, {
						ref: 'headerCenterCt',
						className: 'center',
					}, {
						render: !!this.allowCloseButton,
						className: 'close',
						children: [this.useIcon('close')],
						'on:click': () => this.close()
					}],
				}, {
					render: !!this.subtitle,
					className: 'subtitle',
					textContent: this.subtitle,
				}, {
					ref: 'bodyEl',
					className: 'body',
				}, {
					ref: 'footerEl',
					className: 'footer',
				}],
			}],
		}, this);
	}

	connect() {
		PopupManager.show(this, {
			noLayout: true,
			ignoreScroll: true,
		});

		this.focus();
		this.renderBody && this.renderBody();
	}

	getExtraDailogProps() {
		return {};
	}

	focus() {
		this.el.focus();
	}

	close() {
		if (this.beforeDestroy()) {
			PopupManager.hide(this);
		}
	}
}

class ConfirmDialog extends Dialog {
	beforeRender() {
		this.confirmText ??= 'Ano';
		this.cancelText ??= 'Ne';

		this.onSave = this.onSave || (() => {});
		this.handleError = this.handleError || (() => {});
		this.onClose = this.onClose || (() => {});
	}

	getExtraDailogProps() {
		return {
			nodeName: 'form',
			noValidate: true,
			'on:submit': ev => {
				ev.preventDefault();
				this.onSubmit();
			},
		};
	}

	connect() {
		super.connect();

		this.el.classList.add('form');

		this.append({
			className: 'form-buttons',
			children: this.renderFormButtons(),
		}, null, this.bodyEl);

		this.focus();
	}

	renderFormButtons() {
		return [{
			render: !!this.cancelText,
			nodeName: 'button',
			type: 'button',
			className: this.cancelCls || 'secondary',
			textContent: this.cancelText,
			'on:click': ev => {
				ev.preventDefault();
				this.onClose();
				super.close();
			},
		}, {
			nodeName: 'button',
			type: 'submit',
			className: this.confirmCls || 'primary',
			textContent: this.confirmText,
		}];
	}

	focus() {
		for (let f of this.el.querySelectorAll('button')) {
			if (!f.disabled) {
				f.focus();
			}
		}
	}

	async onSubmit() {
		try {
			this.el.querySelectorAll('button').forEach(b => b.disabled = true);

			this.fire('aftersave', await this.onSave());

			this.destroy();
		} catch(ex) {
			this.el.querySelectorAll('button').forEach(b => b.disabled = false);
			this.handleError(ex);
		}
	}
}

class ValidateChangesFormDialog extends Dialog {
	beforeDestroy() {
		return this.useValidateChangesForm ? !this.form.showUnsavedChanges() : true;
	}

	getFormFields() {}
	onSave() {}
	handleError() {}
	getButtons = null;

	closeForm() {
		this.form.ignoreBeforeDestroyValidation = true;
		this.close()
	}

	connect() {
		this.useValidateChangesForm ??= true;
		super.connect();

		const appendButtons = this.getButtons ? {
			getButtons: () => this.getButtons()
		} : {};

		this.form = this.append({
			class: this.useValidateChangesForm ? ValidateChangesForm : Form,
			'on:data-saved': () => this.closeForm(),
			'on:form-filled-incorrectly-ignored': () => this.closeForm(),
			'on:ignore-unsaved-changes': () => this.closeForm(),
			data: this.data,
			submitText: this.submitText,
			getFormFields: () => this.getFormFields(),
			...appendButtons,
			onSave: async data => await this.onSave(data),
			afterSave: () => this.closeForm(),
			handleError: (ex) => this.handleError(ex)
		}, null, this.bodyEl, true);
	}
}

class NavigationLink extends Sword {
	// Routes on which will be link highlighted by added active class
	activeOnRoutes = [];

	/**
	 * Possible navigation link options
	 * 	  - icon
	 *    - text
	 *    - href
	 *    - disabled
	 */

	render() {
		const link = {
			nodeName: 'a',
			href: this.href,
			className: 'item',
			textContent: this.text,
			'on:click': e => {
				e.preventDefault();

				if (this.disabled) {
					return;
				}

				ROUTER.pushRoute(this.href);
			},
			ref: 'link'
		};


		if (this.icon) {
			this.el = this.createElement({
				children: [this.useIcon(this.icon), link]
			}, this)
		} else {
			this.el = this.createElement(link, this);
		}

		this.setDisabled(this.disabled);
		this.updateActive();
	}

	updateActive() {
		for (const r of (this.activeOnRoutes || [])) {
			if (ROUTER.routePath === r) {
				this.el.classList.add('active');
			}
		}
	}

	setDisabled(disabled) {
		this.disabled = !!disabled;
		this.el.classList.toggle('disabled', this.disabled);
	}

	updateLinkText(text) {
		this.link.textContent = text;
	}
}

class DatePicker extends Sword {
	beforeRender() {
		this.value = '';
		this.required ??= true;
	}

	render() {
		this.el = this.createElement({
			children: [{
				className: 'title',
				ref: 'yearMonth'
			},{
				className: 'days-select',
				children: [{
					children: [this.useIcon('arrow-simple-left')],
					'on:click': () => {
						this.actualMonth.setMonth(this.actualMonth.getMonth() - 1);
						this.updateMonth();
					}
				},{
					ref: 'day_names',
					className: 'days'
				},{
					children: [this.useIcon('arrow-simple-right')],
					'on:click': () => {
						this.actualMonth.setMonth(this.actualMonth.getMonth() + 1);
						this.updateMonth();
					}
				}]
			}, {
				className: 'error-message',
				ref: 'error'
			}]
		}, this);

		this.renderDays();
		this.actualMonth = new Date();
		this.updateMonth();
	}

	updateMonth() {
		const year = this.actualMonth.getFullYear(), month = this.actualMonth.getMonth()

		for (const d of this.getDaysShort()) {
			this[d].innerHTML = '';
			this[d].textContent = d.slice(0, 1).toUpperCase() + d.slice(1, 2);
		}

		this.renderDates(year, month);
		this.yearMonth.textContent = DateUtils.getMonthName(this.actualMonth) + ' ' + year;
	}

	getDaysShort() {
		return ['mon', 'tues', 'wednes', 'thur', 'fri', 'satur', 'sun'];
	}

	renderDays() {
		for (const d of this.getDaysShort()) {
			this.append({
				textContent: d.slice(0, 1).toUpperCase() + d.slice(1, 2),
				ref: d
			}, this, this.day_names);
		}
	}

	getValue() {
		return this.value;
	}

	renderDates(year, month) {
		const first = new Date(year, month, 1);
		// Moving first date to start of a week
		const day = first.getDay();
		first.setDate(first.getDate() - (day === 0 ? 6 : day - 1));

		const last = new Date(year, month + 1, 0);
		const last_day = last.getDay();
		last.setDate(last.getDate() + (last_day === 0 ? 0 : 7 - last_day));

		let actualDate = first;
		const daysShort = this.getDaysShort();

		last.setDate(last.getDate() + 1)
		const lastDayDate = last.getDate();

		while (!(actualDate.getDate() === lastDayDate && actualDate.getMonth() === last.getMonth())) {
			const date = actualDate.getDate();
			const active = actualDate.getFullYear() === year && actualDate.getMonth() === month;

			this.append({
				className: !active ? 'disabled' : '',
				textContent: (date + '').padStart(2, '0'),
				'on:click': e => {
					if (active) {
						const previous = this.el.querySelector('.selected');
						previous?.classList.remove('selected');
						e.target.classList.add('selected');

						this.value = new Date(year, month, date);
					}
				}
			}, null, this[daysShort[actualDate.getDay() === 0 ? 6 : actualDate.getDay() - 1]]);
			actualDate.setDate(date + 1);
		}
	}

	isDisabled() {
		return false;
	}

	// TODO make same as formfield

	validate(showErrorMessage) {
		let msg = !this.value ? 'Toto pole je povinné' : '';

		if (showErrorMessage) {
			if (this.error) {
				this.error.classList.toggle('hidden', !msg);
				this.error.textContent = msg;
			}

			this.el.classList.toggle('error', !!msg);
		}

		return !msg;
	}
}

class UserProfile extends Sword {
	render() {
		this.el = this.createElement({
			'on:click': e => {
				const popup = new UserPopup(document.body);

				PopupManager.show(popup, {
					anchorEl: e.target,
					forceAxis: 'vertical',
					preferReadingOrder: true,
					disableMobileUIPopover: !APP.isMobileUI()
				});
			},
			children: [this.useIcon('user'), {
				textContent: DataManager.session?.name + ' ' + DataManager.session?.surname,
				ref: 'username'
			}]
		})
	}
}

class UserPopup extends PopupMenu {
	beforeRender() {
		function setTheme(theme) {
			APP.setDocumentTheme(theme);
			PopupManager.hideAll();
		}

		const setLang = async (lang) => {
			await DataManager.changeLang(lang);
			PopupManager.hideAll();
		}

		this.options = [{
			iconName: 'user',
			text: i18n._('my_profile'),
			handle: async c => ROUTER.pushRoute(Routes.my_profile)
		},{
			iconName: 'sunmoon',
			text: i18n._('appearance'),
			submenu: [{
				rightIconName: !APP.getDocumentTheme() ? 'check' : null,
				cls: !APP.getDocumentTheme() ? 'active' : undefined,
				iconName: 'sunmoon',
				text: i18n._('use_system_settings'),
				handle: () => setTheme(),
			},{
				rightIconName: APP.getDocumentTheme() === 'light' ? 'check' : null,
				cls: APP.getDocumentTheme() === 'light' ? 'active' : null,
				iconName: 'sun',
				text: i18n._('light'),
				handle: () => setTheme('light'),
			},{
				rightIconName: APP.getDocumentTheme() === 'dark' ? 'check' : null,
				cls: APP.getDocumentTheme() === 'dark' ? 'active' : null,
				iconName: 'moon',
				text: i18n._('dark'),
				handle: () => setTheme('dark'),
			}]
		},{
			iconName: 'translate',
			text: i18n._('language') + ': ' + i18n._(DataManager.session.lang === 'cz' ? 'czech' : 'english'),
			submenu: [{
				rightIconName: DataManager.session.lang === 'cz' ? 'check' : null,
				cls: DataManager.session.lang === 'cz' ? 'active' : undefined,
				text: i18n._('czech'),
				handle: async () => await setLang('cz')
			},{
				rightIconName: DataManager.session.lang === 'en' ? 'check' : null,
				cls: DataManager.session.lang === 'en' ? 'active' : undefined,
				text: i18n._('english'),
				handle: async () => await setLang('en')
			}]
		}, {
			iconName: 'logout',
			text: i18n._('logout'),
			cls: 'logout',
			handle: async c => {
				await DataManager.logout();
				ROUTER.pushRoute(Routes.login);
			}
		}]
	}

	connect() {
		this.el.classList.add('profile-popup');
	}
}

class Tooltip extends Sword {
	mainEl = null;
	toolTipInfo = null;
	direction;

	render() {
		this.tooltip = this.createElement(this.toolTipInfo);

		let directionFn, axis;

		switch (this.direction) {
			case "bottom":
				directionFn = () => this.bottom();
				axis = 'vertical';
				break;
			case "top":
				directionFn = () => this.top();
				axis = 'vertical';
				break;
			case "left":
				directionFn = () => this.left();
				axis = 'horizontal';
				break;
			case "right":
				directionFn = () => this.right();
				axis = 'horizontal';
				break;
			default:
				directionFn = () => this.bottom();
				axis = 'vertical';
		}


		this.el = this.createElement({
			children: [this.mainEl],
			'on:mouseover': () => {
				PopupManager.show(this.tooltip, {
					anchorEl: this.el,
					forceAxis: axis,
					preferReadingOrder: true,
				});

				directionFn();
			},
			'on:mouseleave': () => PopupManager.hide(this.tooltip)
		})
	}

	left() {
		const toolTipRect = this.tooltip.getBoundingClientRect();
		this.tooltip.style.left = (this.el.getBoundingClientRect().left - toolTipRect.width - 10) + 'px';
	}

	right() {
		const elRect = this.el.getBoundingClientRect();

		this.tooltip.style.left = (elRect.left + elRect.width) + 'px';
	}

	top() {
		const toolTipRect = this.tooltip.getBoundingClientRect();
		this.tooltip.style.top = (this.el.getBoundingClientRect().top - toolTipRect.height - 10) + 'px';

		const elRect = this.el.getBoundingClientRect();
		this.tooltip.style.left = (elRect.left + elRect.width / 2) + 'px'
	}

	bottom() {
		const elRect = this.el.getBoundingClientRect();

		this.tooltip.style.top = (elRect.top + elRect.height) + 'px';
		this.tooltip.style.left = (elRect.left + elRect.width / 2) + 'px'
	}
}