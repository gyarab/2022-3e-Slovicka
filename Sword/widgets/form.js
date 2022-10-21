class FormField extends Sword {
	requiredErrorMessage = 'Toto pole je povinné';
	extraClass = null;

	render() {
		if (this.label != null || this.label === " ") {
			this.el = this.createElement({
				className: 'form-field',
				'attr:data-name': this.name,
				children: [{
					ref: 'labelEl',
					render: !!this.label,
					nodeName: 'label',
					textContent: this.label,
				}, {
					ref: 'inputCt',
					className: 'input-ct',
					children: [this.renderInput()],
				}, {
					ref: 'msgCt',
					className: 'message hidden',
				}],
			}, this);
		} else {
			this.el = this.createElement(this.renderInput(), this);
		}

		if (this.extraClass) {
			this.input.classList.add(...this.extraClass.split(/\s+/));
		}

		if (this.value != null) {
			this.setValue(this.value);
		}

		this.afterRender();
	}

	setLabel(text) {
		this.label = text;

		if (this.labelEl) {
			this.labelEl.textContent = text || '';
		}
	}

	isDisabled() {
		return false;
	}

	afterRender() {}

	getRequired() {}

	setDisabled(v) {}

	getViolation() {
		let val = this.getValue();

		if (this.required == null && typeof this.getRequired == 'function') {
			this.required = !!this.getRequired();
		}

		if (this.required) {
			if (val == null || (typeof val == 'string' && val.match(/^\s*$/))) {
				return this.requiredErrorMessage;
			}
		}

		return null;
	}

	validate(updateMsg) {
		if (this.isDisabled()) {
			this.setError();
			return true;
		}

		let msg = this.getViolation();
		if (updateMsg) {
			this.setError(msg);
		}

		return !msg;
	}

	setError(msg) {
		if (this.msgCt) {
			this.msgCt.classList.toggle('hidden', !msg);
			this.msgCt.textContent = msg;
		}

		this.el.classList.toggle('error', !!msg);
	}

	clearValue() {
		this.setValue('');
	}

	focus() {
		this.input.focus();
	}
}

class TextField extends FormField {
	beforeRender() {
		this.type ??= 'text';
		this.enforcePasswordRules ??= false;
		this.autocomplete ??= undefined;
		this.tooLongMessage ??= 'Text is too long';
		this.tooShortMessage ??= 'Text is too short';
		this.required ??= true;
	}

	renderInput() {
		return {
			ref: 'input',
			nodeName: 'input',
			id: this.id,
			type: this.type,
			step: ['number', 'time'].includes(this.type) ? (this.step || 'any') : undefined,
			min: this.min,
			max: this.max,
			minLength: this.minLength,
			maxLength: this.maxLength,
			pattern: this.pattern,
			required: this.required,
			disabled: this.disabled,
			readOnly: this.readOnly,
			tabIndex: this.disabled ? '-1' : '0',
			autocomplete: this.autocomplete,
			autofocus: this.autofocus,
			placeholder: this.placeholder,
			'on:input': () => this.fire('change'),
			'on:blur': () => this.fixup(),
			'on:keydown': e => this.handleKeydown(e)
		};
	}

	handleKeydown(ev) {}

	isDisabled() {
		return this.input.disabled;
	}

	setDisabled(v) {
		this.input.disabled = !!v;
		this.input.tabIndex = v ? '-1' : '0';
	}

	getViolation() {
		let val = this.getValue();

		if (this.required) {
			if (val == null || (typeof val == 'string' && val.match(/^\s*$/))) {
				return 'Toto pole je povinné';
			}
		}

		if (this.type === 'password' && this.enforcePasswordRules) {
			if (val && val.length < 12) {
				return 'Password needs to be at least 12 characters long.';
			}
		}

		if (this.type === 'date') {
			if (val === 'invalid') {
				return 'Invalid date format. Use d.m.y, or m/d/y.';
			}
		}

		if (this.type === 'datetime-local') {
			if (val === 'invalid') {
				return 'Invalid date/time format. Use d.m.y H:M, or m/d/y. H:M';
			}
		}

		if (this.type === 'text') {
			if (this.input.validity && this.input.validity.tooLong) {
				return this.tooLongMessage;
			}

			if (this.input.validity && this.input.validity.tooShort) {
				return this.tooShortMessage;
			}
		}

		if (this.input.type == 'number') {
			if (this.input.validity && this.input.validity.rangeOverflow) {
				return this.getOverflowErrorMessage();
			}

			if (this.input.validity && this.input.validity.rangeUnderflow) {
				return this.getUnderflowErrorMessage();
			}

			if (!this.input.validity.valid) {
				return 'Invalid number.';
			}
		}

		if (this.input.type == 'email') {
			if (!this.input.validity.valid) {
				return 'Invalid e-mail address.';
			}
		}

		if (this.required && this.input.validity && !this.input.validity.valid) {
			return 'Invalid value.';
		}

		return null;
	}

	getUnderflowErrorMessage() {
		return 'Value is too low';
	}

	getOverflowErrorMessage() {
		return 'Value is too high';
	}

	setValue(value) {
		if (this.type === 'date') {
			if (Number.isInteger(value)) {
				// if specifying unix time, we need to make sure
				// value Date object will be in local time
				value = DateUtils.formatUTCDateIso(value);
			}

			value = DateUtils.parseDateIso(value);

			if (value instanceof Date) {
				if (this.input.type == 'date') {
					this.input.value = DateUtils.formatDateIso(value);
					return;
				}

				value = Formats.input_date(value);
			} else {
				value = '';
			}
		}

		if (this.type == 'datetime-local') {
			if (Number.isInteger(value)) {
				if (this.input.type == 'datetime-local') {
					let d = new Date(value * 1000);
					this.input.valueAsNumber = d.getTime() - d.getTimezoneOffset() * 1000 * 60;
					return;
				}

				value = Formats.input_datetime(value);
			} else {
				value = '';
			}
		}

		if (this.type == 'number') {
			if (value == null) {
				this.input.value = '';
			} else {
				this.input.value = Number(value);
			}
			return;
		}

		this.input.value = value == null ? '' : value;
	}

	fixup() {
		if (['date', 'datetime-local', 'time'].includes(this.type)) {
			this.setValue(this.getValue());
		}

		this.fire('blur');
	}

	parseUserDate(s) {
		let d = new Date();
		let ymd, m;

		d.setHours(0, 0, 0, 0);

		if (s == '') {
			return null;
		} else if (m = s.match(/^(\d+)\.(\d+)\.(\d+)$/)) {
			ymd = [Number(m[3]), Number(m[2]) - 1, Number(m[1])];
		} else if (m = s.match(/^(\d+)\/(\d+)\/(\d+)$/)) {
			ymd = [Number(m[3]), Number(m[1]) - 1, Number(m[2])];
		} else if (m = s.match(/^(\d+)\/(\d+)$/)) {
			ymd = [d.getFullYear(), Number(m[1]) - 1, Number(m[2])];
		} else if (m = s.match(/^(\d+)\.(\d+)\.?$/)) {
			ymd = [d.getFullYear(), Number(m[2]) - 1, Number(m[1])];
		} else if (m = s.match(/^(\d+)[\.\/]?$/)) {
			ymd = [d.getFullYear(), d.getMonth(), Number(m[1])];
		} else {
			return 'invalid';
		}

		d.setFullYear(...ymd);

		if (d.getFullYear() != ymd[0] || d.getMonth() != ymd[1] || d.getDate() != ymd[2]) {
			return 'invalid';
		}

		return Math.floor(d.getTime() / 1000);
	}

	parseUserDateTime(s) {
		let me = this;
		let now = new Date(), match;
		let parts = s.split(/\s+/);

		function matchTime(s) {
			if (match = s.match(/^(\d{1,2}):(\d{0,2})$/)) {
				let [whole, h, m] = match;

				now.setHours(Number(h), Number(m), 0, 0);
				return true;
			}

			return false;
		}

		function matchDate(s) {
			let date = me.parseUserDate(s);
			if (date != null && date != 'invalid') {
				let d = new Date(date * 1000);
				now.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
				return true;
			}

			return false;
		}

		function exit(v) {
			return Math.floor(v.getTime() / 1000);
		}

		now.setHours(0, 0, 0, 0);

		if (parts.length == 1) {
			if (parts[0] === '') {
				return null;
			}

			// parse out time or date
			if (matchTime(parts[0]) || matchDate(parts[0])) {
				return exit(now);
			}
		} else if (parts.length == 2) {
			// first try date time and time date variants
			if (matchTime(parts[0]) && matchDate(parts[1])) {
				return exit(now);
			}

			if (matchTime(parts[1]) && matchDate(parts[0])) {
				return exit(now);
			}

			// now try to parse out at least the date
			now.setHours(0, 0, 0, 0);

			if (matchDate(parts[0]) || matchDate(parts[1])) {
				return exit(now);
			}
		}

		return 'invalid';
	}

	getValue() {
		if (this.type == 'date') {
			// valueAsDate return UTC date
			if (this.input.valueAsDate) {
				return DateUtils.formatUTCDateIso(this.input.valueAsDate);
			}

			// our parsing function returns local date
			return DateUtils.formatDateIso(this.parseUserDate(this.input.value.trim()));
		}

		if (this.type == 'datetime-local') {
			if (this.input.valueAsNumber) {
				let d = new Date(this.input.value);

				return Math.floor(d.getTime() / 1000);
			}

			return this.parseUserDateTime(this.input.value.trim());
		}

		if (this.type == 'number') {
			if (!this.input.value.trim()) {
				return null;
			}

			let num = Number(this.input.value);

			return isNaN(num) ? 'invalid' : num;
		}

		if (this.input.value.trim() === '') {
			return null;
		}

		return this.input.value;
	}
}

class PasswordTextField extends TextField {
	renderInput() {
		return {
			className: 'password-field',
			children: [{
				ref: 'input',
				nodeName: 'input',
				type: 'password',
				step: ['number', 'time'].includes(this.type) ? (this.step || 'any') : undefined,
				min: this.min,
				max: this.max,
				minLength: this.minLength,
				maxLength: this.maxLength,
				pattern: this.pattern,
				required: this.required,
				disabled: this.disabled,
				readOnly: this.readOnly,
				tabIndex: this.disabled ? '-1' : '0',
				autocomplete: this.autocomplete,
				autofocus: this.autofocus,
				placeholder: this.placeholder,
				'on:input': () => this.fire('change'),
				'on:blur': () => this.fixup(),
			}, {
				nodeName: 'button',
				title: i18n._('show_password'),
				type: 'button',
				className: 'transparent small no-border icon-only',
				'on:click': e => {
					const inputIsPasswordType = this.input.getAttribute('type') === 'password'
					this.replaceChild(
						this.useIcon(this.input.getAttribute('type') === 'password' ? 'eyeoff' : 'eye'),
						e.currentTarget.firstChild
					);
					e.currentTarget.title = inputIsPasswordType ? 'Skrýt heslo' : 'Zobrazit heslo';
					this.input.setAttribute('type', inputIsPasswordType ? 'text' : 'password')
				},
				children: [this.useIcon('eye')]
			}]
		}
	}
}

class SelectField extends FormField {
	options = [];

	renderInput() {
		return {
			ref: 'input',
			nodeName: 'select',
			'on:input': () => this.fire('change', this.getValue()),
			disabled: this.disabled,
			tabIndex: this.disabled ? '-1' : '0',
			autofocus: this.autofocus,
			className: this.className,
			children: this.options.map(o => {
				return {
					nodeName: 'option',
					value: o.value,
					textContent: o.text,
					data_data: o,
				};
			}),
		};
	}

	setOptions(opts) {
		this.replaceChildren(opts.map(o => {
			return {
				nodeName: 'option',
				textContent: o.text,
				value: o.value,
				data_data: o,
			};
		}), null, this.input);
	}

	isDisabled() {
		return this.input.disabled;
	}

	setDisabled(v) {
		this.input.disabled = !!v;
		this.input.tabIndex = v ? '-1' : '0';
	}

	setValue(value) {
		this.input.value = value == null ? '' : value;
	}

	getValue() {
		return this.input.value;
	}

	getSelectedOption() {
		let option = this.input.selectedOptions[0];

		return option && option.dataset.data;
	}

	selectedValueIsDefault() {
		return this.defaultValue && this.defaultValue + "" === this.getValue();
	}
}

class TextareaField extends FormField {
	beforeRender() {
		this.required = true;
	}

	renderInput() {
		return {
			ref: 'input',
			nodeName: 'textarea',
			disabled: this.disabled,
			tabIndex: this.disabled ? '-1' : '0',
			autofocus: this.autofocus,
			placeholder: this.placeholder,
			required: this.required,
			'on:input': () => this.fire('change'),
			'on:keydown': e => this.fire('keydown', e)
		};
	}

	isDisabled() {
		return this.input.disabled;
	}

	setDisabled(v) {
		this.input.disabled = !!v;
		this.input.tabIndex = v ? '-1' : '0';
	}

	setValue(value) {
		this.input.value = value == null ? '' : value;
	}

	getValue() {
		if (this.input.value.trim() === '') {
			return null;
		}

		return this.input.value;
	}
}

class BinarySwitchField extends FormField {
	renderInput() {
		return {
			ref: 'input',
			className: 'bin-switch',
			children: [{
				className: 'bullet',
			}],
			'on:click': () => this.toggle(),
		};
	}

	toggle() {
		this.input.dataset.state = this.input.dataset.state == "on" ? "off" : "on";
		this.fire('change');
	}

	setValue(value) {
		this.input.dataset.state = value ? "on" : "off";
	}

	getValue() {
		return this.input.dataset.state == "on";
	}

	selectedValueIsDefault() {
		return this.value === this.getValue();
	}
}

// }}}
// {{{ ImageUploadField

class ImageUploadField extends FormField {
	requiredErrorMessage = 'This photo is required';

	renderInput() {
		return {
			ref: 'input',
			className: 'image-upload-field drop-zone',
			'on:drop': ev => {
				let file = this.fileDropHandler(ev);
				if (file) {
					if (file.size > 10000000) {
						Application.notify({
							kind: 'error',
							text: 'File size limit is 10MB.',
							priority: 5,
							timeout: 5000,
						});
						return;
					}

					this.showFile(file);
					this.value = null;
					this.fire('change');
				}
			},
		};
	}

	'after:initComponent'() {
		this.refresh();
	}

	refresh() {
		this.input.textContent = '';

		if (this.fileUrl) {
			this.append({
				nodeName: 'img',
				alt: this.label,
				src: this.fileUrl,
			}, null, this.input);

			this.append({
				className: 'controls',
				children: [{
					nodeName: 'a',
					href: '#',
					textContent: 'Remove photo',
					'on:click': ev => {
						ev.preventDefault();
						this.showFile();
						this.value = null;
						this.fire('change');
					},
				}],
			}, null, this.input);
		} else {
			this.append({
				nodeName: 'button',
				type: 'button',
				className: 'primary',
				textContent: 'Upload',
				'on:click': () => this.doSelectFile()
			}, null, this.input);
		}
	}

	fileDropHandler(ev) {
		try {
			let files = [];

			ev.preventDefault();

			if (ev.dataTransfer.items) {
				for (let i = 0; i < ev.dataTransfer.items.length; i++) {
					if (ev.dataTransfer.items[i].kind === 'file') {
						files.push(ev.dataTransfer.items[i].getAsFile())
					}
				}
			} else {
				for (let i = 0; i < ev.dataTransfer.files.length; i++) {
					files.push(ev.dataTransfer.files[i]);
				}
			}

			if (files.length != 1) {
				Application.notify({
					kind: 'error',
					text: 'Please drag\'n\'drop just a single photo here.',
					priority: 5,
					timeout: 5000,
				});
			} else {
				return files[0];
			}
		} catch (ex) {
			console.log(ex);
		}
	}

	chooseFile() {
		return new Promise((res, rej) => {
			let fileEl = this.append({
				nodeName: 'input',
				type: 'file',
				accept: '.jpg,image/*',
				capture: 'environment',
				'style:display': 'none',
				'on:change': () => {
					res(fileEl.files[0]);
					fileEl.remove();
				}
			}, null, document.body);

			// iOS Safari requires file input to be in the DOM
			fileEl.click();
		});
	}

	showFile(file) {
		if (this.fileUrl) {
			URL.revokeObjectURL(this.fileUrl);
			this.fileUrl = null;
		}

		this.file = file;
		if (file) {
			this.fileUrl = URL.createObjectURL(file);
		}

		this.refresh();
	}

	async doSelectFile(u) {
		let file = await this.chooseFile();
		if (file.size >= 10000000) {
			Application.notify({
				kind: 'error',
				text: 'File size limit is 10MB.',
				priority: 5,
				timeout: 5000,
			});
			return;
		}

		this.showFile(file);
		this.value = null;
		this.fire('change');
	}

	setValue(data) {
		this.fileUrl = data ? data.url : null;
		this.value = data;

		this.refresh();
	}

	getValue() {
		if (this.value) {
			return this.value;
		}

		if (this.file) {
			return {
				file: this.file,
			};
		}

		return null;
	}
}


class AckCheckboxField extends FormField {
	shortText = '';
	longText = '';
	label = '';

	renderInput() {
		let id = Math.random() * 1000000;

		return {
			className: 'ack-checkbox',
			children: [{
				className: 'check form-field',
				children: [{
					ref: 'input',
					nodeName: 'input',
					type: 'checkbox',
					disabled: this.disabled,
					id,
					'on:input': () => this.fire('change'),
				}, {
					nodeName: 'label',
					for: id,
					ref: 'labelEl',
					children: this.getLabelContent(),
				}],
			}, {
				render: !!this.longText,
				className: 'info',
				textContent: this.longText,
			}, {
				render: this.getLinks().length !== 0,
				className: 'links',
				children: this.getLinks(),
			}]
		};
	}

	isDisabled() {
		return this.input.disabled;
	}

	setDisabled(v) {
		this.input.disabled = !!v;
	}

	getLabelContent() {
		return [this.shortText];
	}

	getLinks() {
		return [];
	}

	toggle() {
		this.input.checked = !this.input.checked;
		this.fire('change');
	}

	setValue(value) {
		this.input.checked = !!value;
	}

	getValue() {
		return this.input.checked;
	}

	getViolation() {
		if (!this.required && !this.getValue()) {
			return 'You need to agree to continue';
		}

		return null;
	}
}

class Button extends Sword {
	icon = '';
	text = '';
	async asyncHandler() {}

	beforeRender() {
		this.enabled ??= true;
		this.type ??= 'button';
	}

	render() {
		this.el = this.createElement({
			nodeName: 'button',
			className: 'button ' + (this.className || ''),
			type: this.type,
			ref: 'button',
			children: [this.icon ? this.useIcon(this.icon) : null,{
				nodeName: 'span',
				className: 'text',
				textContent: this.text
			}],
			'on:click': async () => {
				if (!this.enabled) {
					return;
				}

				this.fire('click');

				if (this.asyncHandler) {
					const classList = this.button.classList;

					if (classList.contains('working')) {
						return;
					}

					classList.add('working');
					try {
						await this.asyncHandler();
					} finally {
						classList.remove('working');
					}
				}
			}
		}, this);

		this.setEnabled(this.enabled);
	}

	setEnabled(enabled) {
		this.enabled = enabled;
		if (enabled) {
			this.button.removeAttribute('disabled');
		} else {
			this.button.disabled = true;
		}
	}
}

class Form extends Sword {
	submitText = '';

	/**
	 * Add extra class on submit button
	 * @type {string}
	 */
	submitButtonExtraClass = '';

	render() {
		const links = this.getLinks() || [];

		this.el = this.createElement({
			nodeName: 'form',
			is: CUSTOM_ELEMENT.FORM,
			className: 'form',
			noValidate: true,
			'on:submit': ev => {
				ev.preventDefault();
				this.onSubmit();
			},
			children: [...this.getHeader(), {
				className: 'form-fields',
				ref: 'fieldsCreated',
				children: this.getFormFields()
			},{
				className: 'form-message',
				ref: 'formMessage'
			},{
				className: 'form-buttons',
				ref: 'buttonsCreated',
				children: this.getButtons() || []
			}, {
				render: links.length !== 0,
				className: 'form-links',
				children: links
			}]
		}, this);
	}

	getLinks() {}
	getFormFields() {}
	getButtons() {
		if (this.submitText) {
			return [{
				nodeName: 'button',
				type: 'submit',
				className: 'primary ' + this.submitButtonExtraClass,
				textContent: this.submitText
			}]
		}
	}
	async onSave(data) {}
	async afterSave() {}
	handleError(ex) {
		this.showError(ex.message);
	}


	getHeader() {
		return [this.icon ? this.useIcon(this.icon) : null, {
			render: !!this.subtitle,
			nodeName: 'h3',
			textContent: this.subtitle,
			className: 'form-title',
		},{
			render: !!this.subtitleLabel,
			nodeName: 'p',
			textContent: this.subtitleLabel,
			className: 'form-subtitle',
		}]
	}

	connect() {
		this.traverseComponentChildren(child => {
			child.on('blur', () => this.checkValidity(false), child, true);
			child.on('input', () => this.checkValidity(false), child, true);
		});

		this.checkValidity(false);
		this.focusField();
	}

	focusField() {
		this.traverseComponentChildren(ch => {
			if (ch.autofocus === true) {
				ch.focus();
			}
		})
	}

	unfilled() {
		return (this.children || []).every(child => {
			return !child.getValue || !child.getValue() || child.selectedValueIsDefault && child?.selectedValueIsDefault();
		});
	}

	checkValidity(showErrorMessage) {
		return (this.children || []).every(child => {
			let validation = true;
			if (child.validate) {
				validation = child.validate(showErrorMessage);
			}

			if (!child.required) {
				return true;
			}

			return validation && child.getValue && !!child.getValue();
		});
	}

	disableForm(disable) {
		this.traverseComponentChildren(child => {
			child.validOnly && child.setEnabled && child.setEnabled(!disable);
		});
	}

	getFormValues() {
		let data = {};

		this.traverseComponentChildren(f => {
			if (f.name && f.getValue && (f.isDisabled && !f.isDisabled())) {
				data[f.name] = f.getValue();
			}
		});

		return data;
	}

	setFormValues(data) {
		this.traverseComponentChildren(f => {
			if (f.name && f.setValue) {
				f.setValue(data[f.name]);
				return 'skip';
			}
		});
	}

	/**
	 * Resetuje pole i tlačítka formuláře do výchozího stavu jako po prvotním vytvoření komponenty
	 */
	reset() {
		this.traverseComponentChildren(child => {
			child.clearValue && child.clearValue();
		});

		this.checkValidity(false);
	}

	hideError() {
		this.formMessage.textContent = '';
	}

	showError(text) {
		this.replaceChildren([this.useIcon('alertcirclefull'), {textContent: text}], null, this.formMessage);
	}

	async onSubmit() {
		this.hideError();

		if (!this.checkValidity(true)) {
			this.showError('Prosím vyplňte formulář správně.');
			return;
		}

		let data = this.getFormValues();

		try {
			this.disableForm(true);

			await this.onSave(data);
			this.ignoreBeforeDestroyValidation = true;
			await this.afterSave();
		} catch(ex) {
			this.disableForm(false);
			this.handleError(ex);
		}
	}
}

class ValidateChangesForm extends Form {
	beforeRender() {
		if (!this.data) {
			console.warn('Original data were not provided');
		}
	}

	validateChanges(data) {
		for (const [k, v] of Object.entries(data)) {
			if (!this.data[k] || this.data[k] === null && v === null) {
				continue;
			}

			if (this.data[k] + "" !== v + "") {
				return true
			}
		}
	}

	showUnsavedChanges() {
		if (this.ignoreBeforeDestroyValidation) {
			return;
		}

		const unfilled = this.unfilled();

		if (unfilled) {
			return;
		}

		const valid = this.checkValidity();

		if (!valid) {
			const me = this;

			new ConfirmDialog(document.body, {
				title: 'Nesprávně vyplněný formulár',
				subtitle: `Zavíráte záznam s neuloženými změnami.\n\r Chcete pokračovat v editaci?`,
				confirmText:  'Pokračovat',
				cancelText: 'Zahodit změny',

				onClose() {
					me.fire('form-filled-incorrectly-ignored');
				}
			});

			return true;
		}

		const data = this.getFormValues();
		const unsavedChanges = this.validateChanges(data);

		if (unsavedChanges) {
			const me = this;

			new ConfirmDialog(document.body, {
				title: 'Neuložené změny',
				subtitle: `Zavíráte záznam s neuloženými změnami.\n\r Chcete změny uložit?`,
				confirmText:  'Uložit',
				cancelText: 'Zahodit změny',
				allowCloseButton: true,

				onClose() {
					me.fire('ignore-unsaved-changes');
				},

				async onSave() {
					await me.onSave(data);
					me.fire('data-saved');
				}
			});
		}

		return unsavedChanges;
	}

	async disconnect() {
		this.showUnsavedChanges();
	}
}

class ListFormField extends Sword {
	allowDeleteButton = true;
	data = null;

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				children: [...this.getFields(), {
					className: 'delete-btn',
					render: this.allowDeleteButton,
					'on:click': () => {
						this.fire('delete', this.data);
						this.destroy();
					},
					children: [this.useIcon('close')]
				}]
			},{
				ref: 'error',
				className: 'hidden',
			}]
		}, this);
	}

	connect() {
		this.data && this.setValue();
		this.disabled && this.disable();
	}

	setValue() {
		this.traverseComponentChildren(f => f.setValue && f.name && f.setValue(this.data[f.name]));
	}

	getFields() {
		return [];
	}

	getValue() {
		let data = {...this.data};

		this.traverseComponentChildren(f => {
			if (f.name && f.getValue && (f.isDisabled && !f.isDisabled())) {
				data[f.name] = f.getValue();
			}
		});

		return data;
	}

	disable() {
		this.traverseComponentChildren(f => f.disable && f.disable());
	}

	isDisabled() {
		return this.disabled;
	}

	validate() {
		this.traverseComponentChildren(f => f.disable && f.validate());
	}

	setError(text) {
		this.error.textContent = text;
	}
}

class ListForm extends Form {
	values = [];
	getField(value) {}
	getLinks() {}
	allowAddButton = true;
	renderOneEmptyRow = false;

	render() {
		const links = this.getLinks() || [];

		this.el = this.createElement({
			nodeName: 'form',
			is: CUSTOM_ELEMENT.FORM,
			className: 'form',
			noValidate: true,
			'on:submit': ev => {
				ev.preventDefault();
				this.onSubmit();
			},
			children: [...this.getHeader(), {
				className: 'form-fields',
				ref: 'fields'
			},{
				className: 'form-message',
				ref: 'formMessage'
			},{
				className: 'form-buttons',
				ref: 'buttonsCreated',
				children: this.getButtons() || []
			}, {
				render: links.length !== 0,
				className: 'form-links',
				children: links
			}]
		}, this);
	}

	getFormValues() {
		const values = [];

		this.traverseComponentChildren(f => {
			if (f.getValue && (f.isDisabled && !f.isDisabled())) {
				values.push(f.getValue());
			}
		});

		return values;
	}

	validateChanges() {
		const values = this.getFormValues();
		const origin = this.values;
		this.traverseComponentChildren(f => f.data && origin.push(f.data));

		if (values.length > origin.length) {
			return true;
		}

		for (let i = 0; i < values.length; i++) {
			const v = values[i], o = origin[i];

			if (v !== o) {
				return true;
			}
		}
	}

	connect() {
		super.connect();

		for (const v of this.values) {
			const f = this.getField(v);
			this.append(f, this, this.fields);
		}

		this.renderOneEmptyRow && this.append(this.getField(), this, this.fields);
		this.allowAddButton && this.renderAddButton();
	}

	renderAddButton() {
		this.append({
			nodeName: 'button',
			className: 'add-button',
			type: 'button',
			children: [this.useIcon('plus'), 'Add field'],
			'on:click': () => {
				const field = this.createElement(this.getField(), this);
				this.fields.insertBefore(field.el, this.fields.lastChild);
			}
		}, null, this.fields)
	}
}

class ExpandableTextAreaField extends TextareaField {
	beforeRender() {
		this.onMinimize ??= null;
	}

	renderInput() {
		return {
			className: 'expandable-text-area-field-wrap',
			children: [super.renderInput(), {
				className: 'icon',
				children: [this.useIcon(this.onMinimize ? 'fi-minimize' : 'fi-maximize')],
				'on:click': () => {
					if (this.onMinimize) {
						this.onMinimize();
						return;
					}

					this.maximize()
				}
			}]
		}
	}

	maximize() {
		const me = this;

		new Dialog(document.body, {
			title: this.label,
			className: 'expanded-text-area-dialog',
			renderBody() {
				const minimize = () => {
					me.setValue(this.textArea.getValue());
					this.close();
				};

				this.append({
					children: [{
						class: ExpandableTextAreaField,
						value: me.getValue(),
						required: me.required,
						placeholder: me.placeholder,
						disabled: me.disabled,
						name: me.name,
						onMinimize: minimize,
						ref: 'textArea'
					},{
						className: 'form-buttons',
						children: [{
							nodeName: 'button',
							className: 'secondary',
							textContent: 'Cancel',
							'on:click': ev => {
								ev.preventDefault();
								this.close();
							},
						}, {
							nodeName: 'button',
							type: 'submit',
							className: 'primary',
							textContent: 'Confirm',
							'on:click': () => minimize()
						}]
					}]
				}, this, this.bodyEl);
			}
		})
	}
}

class ExcludableSelectField extends SelectField {
	/**
	 * Items which are already selected
	 * @type {[]}
	 */
	used = [];

	async onItemRemove(value) {}
	async onItemSelect(value) {}

	beforeRender() {
		this.defaultValue ??= '';
		this.defaultText ??= 'Select one of the options';

		this.available = [{
			value: this.defaultValue,
			text: this.defaultText
		}].concat(this.options);
	}

	renderInput() {
		return {
			children: [{
				ref: 'input',
				nodeName: 'select',
				'on:input': async () => {
					const value = this.getValue();

					if (value === this.defaultValue) {
						return;
					}

					const item = this.removeAvailableOption(value);
					this.renderItem(item);

					await this.onItemSelect(value);
				},
				disabled: this.disabled,
				tabIndex: this.disabled ? '-1' : '0',
				autofocus: this.autofocus,
				className: this.className,
				children: this.available.map(o => {
					return {
						nodeName: 'option',
						value: o.value,
						textContent: o.text,
						data_data: o,
					};
				}),
			},{
				ref: 'items'
			}]
		};
	}

	removeAvailableOption(value) {
		const idx = this.available.findIndex(p => p.value === value);
		const item = this.available[idx];

		this.available.splice(idx, 1);
		this.setOptions(this.available);

		this.setDefaultValue();

		return item;
	}

	afterRender() {
		if (Utils.isArray(this.used)) {
			this.renderItems(this.used);
		}

		this.setDefaultValue();
	}

	/**
	 * This method is used when some values are already used
	 */
	renderItems(items) {
		for (const i of items) {
			this.renderItem(i);
		}
	}

	renderItem(value) {
		const item = this.append({
			children: [{
				nodeName: 'span',
				textContent: value.text
			},{
				nodeName: 'span',
				children: [this.useIcon('close')],
				'on:click': async () => {
					await this.onItemRemove(value);

					item.remove();
					this.available.push(value);
					this.setOptions(this.available);

					this.setDefaultValue();
				}
			}]
		}, null, this.items)
	}

	setDefaultValue() {
		this.setValue(this.defaultValue);
	}
}