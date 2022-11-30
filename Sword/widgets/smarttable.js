function prepFormat(valPrep, fmt, postProc = v => v) {
	return v => {
		if (v != null) {
			v = valPrep(v);

			return postProc(fmt.format(v));
		}

		return '';
	};
}

Formats = ((lang) => ({

	time: prepFormat(v => new Date(v * 1000), new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: 'numeric', second: 'numeric' })),

	date: prepFormat(v => new Date(v * 1000), new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'numeric', day: 'numeric' })),
	date_utc: prepFormat(v => new Date(v * 1000), new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })),
	datetime: prepFormat(v => new Date(v * 1000), new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'})),

	date_weekday: prepFormat(v => new Date(v * 1000), new Intl.DateTimeFormat(lang, { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })),

	date_or_datetime: v => {
		if (v == null) {
			return '';
		}

		let vd = new Date(v * 1000);
		if (vd.getHours() === 0 && vd.getMinutes() === 0 && vd.getSeconds() === 0) {
			return Formats.date(v);
		} else {
			return Formats.datetime(v);
		}
	},

	input_date: v => {
		let d = new Date(v * 1000);

		if (lang === 'cs-CZ') {
			return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
		} else {
			return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
		}
	},

	input_datetime: v => {
		let d = new Date(v * 1000);
		let has_time = (d.getHours() + d.getMinutes() + d.getSeconds() + d.getMilliseconds()) > 0;

		function p(number) {
			return number < 10 ? '0' + number : number;
		}

		return Formats.input_date(v) + (has_time ? ' ' + d.getHours() + ':' + p(d.getMinutes()) : '');
	},

	percent: v => {
		if (v === null || v === undefined) {
			return '';
		}
		v = Math.round(v * 100);
		return v + '\u2009%';
	},

	bool: v => {
		return v ? 'Ano' : 'Ne';
	},

	call_direction: v => {
		return {
			internal: 'Interní',
			'in': 'Příchozí',
			'out': 'Odchozí',
		}[v] || v;
	},

	call_result: v => {
		return {
			connected: 'Spojený',
			abandoned: 'Opuštěný',
			rejected: 'Odmítnutý',
			missed: 'Zmeškaný',
			busy: 'Obsazený',
		}[v] || 'Neuskutečněný';
	},

	duration: v => {
		if (v === null || v === undefined) {
			return '';
		}
		v = Math.floor(v / 1000);
		return [
			(v / 60 / 60) | 0,
			(v / 60 % 60) | 0,
			(v % 60) | 0,
		]
			.join(":")
			.replace(/\b(\d)\b/g, "0$1");
	}
}))({
	cs: 'cs-CZ',
	en: 'en-US',
}['cs-CZ']);

class SmartTable extends Sword {
	selectable = false;
	emptyText = 'Žádné výsledky';
	sort = null;

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			className: 'smart-table',
			children: [{
				nodeName: 'table',
				children: [{
					nodeName: 'thead',
					ref: 'head',
					children: [{
						ref: 'headRow',
						nodeName: 'tr',
					}],
					'on*:click': ev => {
						let th = ev.target.closest('th');
						if (th && th.dataset.col) {
							if (th.dataset.col.filter) {
								this.onFilterSelect(th, th.dataset.col);
							}
							if (th.dataset.col.sortable) {
								let newSort = '<' + th.dataset.col.id;
								if (newSort == this.sort) {
									newSort = '>' + th.dataset.col.id;
								}

								this.onSortChange(newSort);
							}
						}
					},
				}, {
					nodeName: 'tbody',
					ref: 'body',
					'on*:click': ev => {
						let tr = ev.target.closest('tr');
						if (tr && tr.dataset.data) {
							this.onRowClick(tr.dataset.data, tr, ev);
						}
					},
				}],
			}, {
				className: 'empty-message',
				textContent: this.emptyText,
				ref: 'msgEl',
			}]
		}, this);
	}

	connect() {
		this.el.classList.toggle('selectable', !!this.selectable);
		this.renderHeaderRow(!this.rows || !this.rows.length);

		if (this.extraClass) {
			this.el.classList.add(...this.extraClass.split(/\s+/));
		}

		if (this.rows) {
			this.setData(this.rows);
		}

		if (this.monitorOverflow) {
			this.initOverflowMonitor();
		}
	}

	disconnect() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}

	initOverflowMonitor() {
		let update = () => {
			this.el.dataset.overflowed = this.el.clientWidth < this.el.scrollWidth ? '1' : '0';
		};

		this.resizeObserver = new ResizeObserver(() => {
			update();
		});

		this.resizeObserver.observe(this.el);
		update();
	}

	renderHeaderRow(empty) {
		this.headRow.classList.toggle('no-data', empty);
		this.headRow.innerHTML = '';

		for (const c of this.getColumns()) {
			let filterIcon = c.filter ? this.useIcon( this.isFilterActive(c) ? 'filled-true' : 'filled-false', {cls: 'filter-icon'} ) : null;

			let sortShown = this.sort && this.sort.substring(1) == c.id;
			let sortIcon;
			if (sortShown) {
				sortIcon = this.useIcon(this.sort[0] == '<' ? 'arrow-up' : 'arrow-down', {cls: 'sort-icon'});
			}

			this.append({
				data_col: c,
				nodeName: 'th',
				className: (c.align || '') + (this.isFilterActive(c) ? ' filtered' : '') + (sortShown ? ' sorted' : '') + (c.sortable ? ' sortable' : ''), //+ (filterIcon ? ' filterable' : ''),
				children: c.children || [{textContent: c.name} || '', filterIcon, sortIcon],
				'data-col': c.id,
			}, null, this.headRow);
		}
	}

	setSort(sort) {
		this.sort = sort;
	}

	renderCell(td, r, c) {
		if (c.format && Formats[c.format]) {
			td.textContent = Formats[c.format](r[c.id]);
			return;
		} else if (c.formatCell) {
			c.formatCell(this, td, r[c.id], r);
			return;
		}

		let used = false;
		if (c.editButton === true) {
			if (!c.editDialog) {
				throw new Error(`Edit dialog is missing. Cell with edit button must consist of 
				{editButton: true, editDialog: Dialog} and this dialog must fire event success on finish`);
			}

			this.append(this.createEditButton(c.editDialog, r), null, td);
			used = true;
		}

		if (c.deleteButton === true) {
			if (!c.deleteDialog) {
				throw new Error(`Delete dialog is missing. Cell with edit button must consist of 
				{editButton: true, deleteDialog: Dialog} and this dialog must fire event delete on delete`);
			}

			this.append(this.createDeleteButton(c.deleteDialog, r), null, td);
			used = true;
		}

		if (!used) {
			td.textContent = r[c.id];
		}
	}

	setData(rows) {
		let columns = this.getColumns();

		this.renderHeaderRow(rows.length <= 0);

		this.body.textContent = '';
		this.msgEl.classList.toggle('hidden', rows.length > 0);

		for (let r of rows) {
			let tr = this.append({
				data_data: r,
				nodeName: 'tr',
			}, null, this.body);

			for (const c of columns) {
				let td = this.append({
					nodeName: 'td',
					'data-col': c.id,
					className: c.align || undefined,
				}, null, tr);

				this.renderCell(td, r, c);
			}

			this.renderRow(tr, r);
		}

		this.data = rows;
	}

	getColumns() {}
	renderRow(tr, row) {}

	onSortChange(sort) {}

	onFilterSelect(th, column) {}

	isFilterActive(column) {
		return false;
	}

	onRowClick(row, tr, ev) {}

	selectRow(fn) {
		this.body.querySelectorAll('tr').forEach(tr => tr.classList.toggle('selected', !!fn(tr.dataset.data, tr)));
	}

	createEditButton(editDialog, data) {
		return {
			nodeName: 'button',
			type: 'button',
			children: ['icon:pencil', {textContent: i18n._('edit')}],
			className: 'secondary icon-left small',
			title: 'Edit',
			'on:click': () => new editDialog(document.body, {
				data,
				'on:success': (obj, user) => {
					const idx = this.data.findIndex(u => u.id === user.id);
					this.data[idx] = user;
					this.setData(this.data);
				}
			})
		}
	}

	createDeleteButton(dialog, data) {
		return {
			nodeName: 'button',
			type: 'button',
			children: ['icon:bin', {textContent: i18n._('delete')}],
			className: 'secondary icon-left small',
			'on:click': () => new dialog(document.body, {
				data,
				'on:delete': (obj, attr='id') => {
					this.data = this.data.filter(t => t[attr] !== data[attr]);
					this.setData(this.data);
				}
			})
		}
	}
}

class SearchInput extends Sword {
	beforeRender() {
		this.onInputHandler = this.onInputHandler || (value => {});
	}

	render() {
		this.clearInput = () => {
			this.input.value = "";
			this.onInput();
		}

		this.el = this.createElement({
			children: [{
				ref: 'input',
				nodeName: 'input',
				type: 'search',
				className: 'small',
				placeholder: i18n._('Vyhledat'),
				'on:input': () => this.onInput(),
				'on:keyup': (e) => {
					if (e.key === "Escape") {
						this.clearInput()
					}
				},
			}, {
				ref: 'delete',
				nodeName: 'button',
				type: 'button',
				className: 'transparent small icon-only hidden',
				children: [this.useIcon('close')],
				'on:click': this.clearInput,
			}]
		}, this);
	}

	onInput() {
		const value = this.input.value;
		this.delete.classList.toggle('hidden', value.length === 0);

		/**
		 * Making async for not slowing flow of the app
		 */
		new Promise((res, reject) => {
			this.onInputHandler(value);
			this.input.focus();
			res();
		});
	}
}