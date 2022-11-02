class CourseStateSelect extends SelectField {
	beforeRender() {
		this.className = 'course-state';
		this.options = [{
			text: 'Paused',
			value: 'paused'
		},{
			text: 'Published',
			value: 'published'
		},{
			text: 'Closed',
			value: 'closed'
		}]
	}
}

class WordCreateDialog extends ValidateChangesFormDialog {
	beforeRender() {
		this.data ??= {};
		this.submitText =  i18n._(this.data.id ? 'save' :'add_word');
		this.title =  i18n._(this.data.id ? 'edit_word' : 'add_word');
		this.allowCloseButton = true;
	}

	getFormFields() {
		return [{
			class: TextField,
			name: 'word',
			label: i18n._('word'),
			value: this.data.word,
			autofocus: !this.data?.group,
			required: false,
			disabled: this.data?.group
		},{
			autofocus: !!this.data?.group,
			class: TextField,
			name: 'definition',
			label: i18n._('definition'),
			value: this.data.definition,
			required: false
		},{
			class: TextField,
			name: 'translation',
			label: i18n._('translation'),
			value: this.data.translation,
			required: false
		},{
			class: TextField,
			name: 'phonetic',
			label: i18n._('phonetic'),
			value: this.data.phonetic,
			required: false
		},{
			class: TextField,
			name: 'sentence',
			label: i18n._('sentence'),
			value: this.data.sentence,
			required: false
		}]
	}

	async onSave(data) {
		let word = await (this.data.group ?
			REST.PUT(`${this.saveEndpointPrefix}/${this.data.course}/words/${this.data.group}`, data) :
			REST.POST(`${this.saveEndpointPrefix}/${this.data.course}/nodes/${this.data.node}/words`, data)
		);

		this.fire('success', word);
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			404: i18n._('Language not found'),
			401: i18n._('You don\'t have access to this course')
		}[ex.status]);
	}
}

class CourseNodeEditor extends Sword {
	words = [];

	render() {
		const me = this;

		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				class: AppHeader
			},{
				className: 'body',
				children: [{
					className: 'node-info',
					children: [{
						className: 'header',
						ref: 'header'
					},{
						ref: 'nodeInfo',
						class: Form,
						submitText: i18n._('save'),
						getFormFields() {
							return [{
								class: TextField,
								name: 'name',
								label: i18n._('name'),
							}, {
								class: TextField,
								name: 'description',
								label: i18n._('description'),
							}].concat(me.getFields())
						},
						onSave: async data => {
							await this.onSave(data);
							this.addWordBtn.disabled = false;
						},
						handleError: ex => this.handleError(ex)
					}]
				},{
					className: 'words',
					children: [{
						className: 'header',
						children: [{
							nodeName: 'h4',
							className: 'title',
							textContent: i18n._('words')
						},{
							disabled: !this.data?.id,
							ref: 'addWordBtn',
							nodeName: 'button',
							type: 'button',
							children: ['icon:plus', {textContent: i18n._('add_word')}],
							className: 'primary icon-left',
							'on:click': () => {
								if (!this.data?.id) {
									NOTIFICATION.showStandardizedINFO(i18n._('Create new node first'));
									return;
								}

								new WordCreateDialog(document.body, {
									saveEndpointPrefix: this.wordEndpointPrefix,
									data: {
										course: me.data.course,
										node: me.data.id
									},
									'on:success': (obj, word) => {
										me.words.push(word);
										me.renderWord(word)
									}
								})
							}
						}]
					},{
						ref: 'wordList',
						className: 'word-list'
					}]
				}]
			}]
		}, this);

		this.init();
	}

	onSave() {}
	loadData() {}
	handleError() {}
	renderHeader() {}
	getFields() { return []; }

	async init() {
		await this.loadData();
		this.renderHeader();
		this.addWordBtn.disabled = !this.data?.id;
	}

	async loadWords() {
		this.words = await REST.GET(`${this.wordEndpointPrefix}/${this.data.course}/nodes/${this.data.id}/words`);

		this.renderWords()
	}

	renderWords() {
		this.wordList.innerHTML = '';

		for (const w of this.words) {
			this.renderWord(w);
		}
	}

	deleteWordDialog(word) {
		const me = this;

		new ConfirmDialog(document.body, {
			title: i18n._('Are you sure you want to remove this word?'),
			confirmText: i18n._('yes'),
			cancelText: i18n._('no'),
			onSave: async () => {
				try {
					await REST.DELETE(`${me.wordEndpointPrefix}/${me.data.course}/words/${word.group}`);
					me.words.deleteByIndex(w => w.group === word.group);
					me.renderWords();
				} catch (ex) {
					NOTIFICATION.showStandardizedError({
						404: i18n._('Course was not found'),
						401: i18n._('You don\'t have access to this word')
					});
				}
			}
		})
	}

	renderWord(word) {
		const me = this;

		this.append({
			className: 'word',
			children: [{
				className: 'word-header',
				children: [{
					className: 'word-name',
					textContent: word.word
				},{
					className: 'edit',
					children: ['icon:pencil'],
					'on:click': () => new WordCreateDialog(document.body, {
						saveEndpointPrefix: this.wordEndpointPrefix,
						data: {
							...word,
							group: word.group,
							course: this.data.course
						},
						'on:success': (obj, word) => {
							me.words.updateByIndex(word, w => w.id === word.id);
							me.renderWords();
						}
					})
				},{
					className: 'delete',
					children: ['icon:delete'],
					'on:click': () => this.deleteWordDialog(word)
				}]
			},{
				render: !!word.definition,
				textContent: word.definition
			},{
				render: !!word.sentence,
				textContent: word.sentence
			},{
				render: !!word.phonetic,
				textContent: word.phonetic
			},{
				render: !!word.translation,
				textContent: word.translation
			}]
		}, null, this.wordList)
	}
}

class CourseEditor extends CourseNodeEditor {
	beforeRender() {
		this.wordEndpointPrefix = 'courses';
	}

	async onSave(data) {
		const newNode = !this.data?.id;
		const course = this.data?.course;
		this.data = await REST[course ? 'PUT' : 'POST'](`courses${course ? '/' + course : ''}`, data);

		this.data.course = this.data.id;
		this.data.id = this.data.node;

		NOTIFICATION.showStandardizedSuccess(i18n._(newNode ? 'Course saved' : 'Course updated'));

		if (newNode) {
			const url = new URL(Routes.courses_editor + '/' + this.data.course, location.href)
			history.pushState({}, '', url.toString());
			this.courseState.setDisabled(false);
			this.courseVisibility.setDisabled(false);
			this.deleteBtn.disabled = false;
		}
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			404: i18n._('Course not found'),
			401: i18n._('You don\'t have access to this course')
		}[ex.status]);
	}

	getFields() {
		return [{
			class: SelectField,
			name: 'language',
			label: i18n._('language'),
			options: Utils.convertArrayToOptions(DataManager.languages, 'id', 'name')
		}]
	}

	async loadData() {
		try {
			if (this.id) {
				this.data = await REST.GET(`courses/${this.id}`);
				this.data.course = this.data.id;
				this.data.id = this.data.node;

				this.nodeInfo.setFormValues(this.data);
				await this.loadWords();
			}
		} catch (ignored) {}
	}

	deleteCourseDialog() {
		const me = this;

		new ConfirmDialog(document.body, {
			title: i18n._('Are you sure you want to delete this course?'),
			confirmText: i18n._('yes'),
			cancelText: i18n._('no'),
			async onSave() {
				try {
					await REST.DELETE(`courses/${me.data.course}`);

					NOTIFICATION.showStandardizedSuccess(i18n._(`Course has been successfully deleted.`))
					ROUTER.pushRoute(Routes.courses);
				} catch (ex) {
					NOTIFICATION.showStandardizedError({
						404: i18n._('Course not found')
					}[ex.status]);
				}
			}
		})
	}

	setHeaderSwitchDisability(disabled) {
		this.courseState.setDisabled(disabled);
		this.courseVisibility.setDisabled(disabled);
	}

	renderHeader() {
		this.replaceChildren([{
			className: 'title',
			nodeName: 'h4',
			textContent: i18n._(`Course information`)
		},{
			disabled: !this.data?.id,
			ref: 'courseState',
			class: CourseStateSelect,
			'on:change': async (obj, value) => {
				try {
					await REST.PUT(`courses/${this.data.course}/state`, {state: value})
				} catch (ex) {
					NOTIFICATION.showStandardizedError({
						404: i18n._('Course not found')
					}[ex.status])
				}
			}
		},{
			disabled: !this.data?.id,
			ref: 'courseVisibility',
			className: 'visibility',
			class: SelectField,
			options: ['ME', 'EVERYONE'].map(s => ({text: i18n._(s), value: s})),
			'on:change': async (obj, value) => {
				try {
					await REST.PUT(`courses/${this.data.course}/visibility`, {visibility: value})
				} catch (ex) {
					NOTIFICATION.showStandardizedError({
						404: i18n._('Course not found')
					}[ex.status])
				}
			}
		},{
			disabled: !this.data?.id,
			ref: 'deleteBtn',
			nodeName: 'button',
			type: 'button',
			className: 'course-delete error',
			children: ['icon:delete'],
			'on:click': async () => this.deleteCourseDialog()
		}], this, this.header);
	}
}

class Courses extends Sword {
	render() {
		const me = this;

		this.el = this.createElement({
			children: [{
				className: 'header',
				children: [{
					textContent: 'Courses'
				},{
					nodeName: 'button',
					type: 'button',
					children: ['icon:plus', {textContent: i18n._('create_new_course')}],
					className: 'primary icon-left',
					'on:click': () => ROUTER.pushRoute(Routes.courses_editor)
				},{
					textContent: 'Here will be filters...'
				}]
			},{
				className: 'tutorial',
				children: [{
					textContent: i18n._('Don\'t know where to go?')
				},{
					textContent: i18n._('Go quickly threw our tutorial')
				}],
				'on:click': () => ROUTER.pushRoute(Routes.tutorial)
			},{
				className: 'courses',
				ref: 'coursesList'
			}]
		}, this);

		this.loadCourses();
	}

	async loadCourses() {
		this.courses = await REST.GET('courses/list');

		for (const c of this.courses) {
			this.append({
				className: 'course',
				textContent: c.name,
				'on:click': () => ROUTER.pushRoute(Routes.courses_editor + '/' + c.id)
			}, null, this.coursesList);
		}
	}
}

class Tutorial extends Sword {
    heading;
    text;
    number;

	render() {
	    this.el = this.createElement({
		    children: [{
        	    className: 'header',
        	    ref: 'heading'
   	    		children: [{
   	    		    children: [{
                        textContent: i18n._('1      Introduction')
                        ref: 'introduction'
                    },{
                       	textContent: i18n._('2      Courses')
                       	ref: 'courses'
                    },{
                        textContent: i18n._('3      Adventures')
                        ref: 'adventures'
                    }],
                }],
        	},{
        	    className: 'title',
        	    textContent: this.heading
       	    },{
       	        className: 'text',
       	        textContent: this.text
       	    },{
       	        className: 'buttons'
       	        if (number != 1) {
        		    nodeName: 'button',
            		type: 'button',
            		children: ['icon:plus', {textContent: i18n._('back')}],
            		className: 'primary icon-left',
        	    	'on:click': () => redrawing()
                }
                if (number != 3) {
                    nodeName: 'button',
                    type: 'button',
                    children: ['icon:plus', {textContent: i18n._('next')}],
                    className: 'primary icon-right',
                    'on:click': () => redrawing()
                }
            }]
        }, this);
	}

	redrawing() {
	    sections.map(s => {
        	if (s === 's') return something
        	return {
        		'onclick': renderSection

	        }
        }
	renderSection() {

	}
}

class Tutorial1 extend Tutorial {
    beforeRender() {
        this.heading = 'Introduction';
        this.text = 'Here will be introduction';
        this.number = 1;
    }
}
class Tutorial2 extend Tutorial {
    beforeRender() {
        this.heading = 'courses';
        this.text = 'Here will be something about courses';
        this.number = 2;
    }
}
class Tutorial3 extend Tutorial {
    beforeRender() {
        this.heading = 'Adventures';
        this.text = 'Here will be adventure';
        this.number = 3;
    }
}