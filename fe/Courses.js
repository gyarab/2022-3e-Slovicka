class CourseStateSelect extends SelectField {
	beforeRender() {
		this.className = 'course-state';
		this.options = [{
			text: i18n._('Creating'),
			value: 'creating'
		},{
			text: i18n._('Paused'),
			value: 'paused'
		},{
			text: i18n._('Published'),
			value: 'published'
		},{
			text: i18n._('Closed'),
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
			required: true
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
			language_not_found: i18n._('Language not found'),
			course_not_found: i18n._('You don\'t have access to this course'),
			published_node: i18n._('Published node cannot be edited')
		}[ex.code]);
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
						className: 'responsive-header header',
						ref: 'header'
					},{
						ref: 'nodeInfo',
						class: Form,
						className: 'information-form',
						submitText: i18n._('save'),
						getFormFields() {
							return [{
								class: TextField,
								name: 'name',
								label: i18n._('w_name'),
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
						className: 'responsive-header header',
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
										me.onWordInsert();
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

	onWordInsert() {}
	onSave() {}
	loadData() {}
	handleError() {}
	renderHeader() {}
	getFields() { return []; }

	async init() {
		await this.loadData();
		this.renderHeader();
		this.addWordBtn.disabled = !this.data?.id;

		if (this.data?.state === 'published') {
			this.nodeInfo.disableForm(true);
			this.addWordBtn.disabled = true;
		}
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
					render: this.data?.state !== 'published',
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
					render: this.data?.state !== 'published',
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

class AddToFolderDialog extends Dialog {
	beforeRender() {
		this.title = i18n._('Add course to folder');
		this.allowCloseButton = true;
	}

	async renderBody() {
		const folders = await REST.GET(`folders`);
		this.selectedFolder = folders[0].id;

		this.append({
			children: [{
				class: TextField,
				label: i18n._('New folder'),
				ref: 'newFolderName'
			},{
				className: 'divider',
				children: [{
					className: 'line'
				},{
					className: 'or',
					textContent: i18n._('Or')
				},{
					className: 'line'
				}]
			},{
				class: SelectField,
				label: i18n._('Select folder'),
				options: folders.map(f => ({text: f.name, value: f.id})),
				'on:change': (obj, value) => this.selectedFolder = value
			},{
				nodeName: 'button',
				type: 'button',
				children: [{textContent: i18n._('save')}],
				className: 'primary icon-left new-course',
				'on:click': async () => {
					try {
						let folderId = this.selectedFolder;
						const name = this.newFolderName.getValue();

						if (!folderId && !name) {
							NOTIFICATION.showStandardizedError(i18n._('Name must be filled when folder is not selected'));
							return;
						}

						if (name) {
							folderId = (await REST.POST(`folders`, {name})).id;
						}

						await REST.POST(`folders/${folderId}/course/${this.id}`);
						this.close();
						NOTIFICATION.showStandardizedSuccess(i18n._(`Course has been saved into folder`));
					} catch (ex) {
						if (ex.code === 'course_already_added') {
							NOTIFICATION.showStandardizedWarning(i18n._('Course is already in folder'));
						}
					}
				}
			}]
		}, this, this.bodyEl);
	}
}

class Courses extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				className: 'responsive-header header',
				children: [{
					nodeName: 'h3',
					textContent: i18n._('courses')
				},{
					nodeName: 'button',
					type: 'button',
					children: ['icon:plus', {textContent: i18n._('create_new_course')}],
					className: 'primary icon-left new-course',
					'on:click': () => ROUTER.pushRoute(Routes.courses_editor)
				},{
					class: SearchInput,
					onInputHandler: search => {
						const filtered = Utils.filterRows(search, this.courses, ['name', 'language'], 'name');
						this.renderCourses(filtered);
					}
				}]
			},{
				className: 'courses',
				ref: 'coursesList'
			}]
		}, this);

		this.loadCourses();
	}

	async loadCourses() {
		this.courses = await REST.GET('courses/list?withRatings=true&withWordCount=true');

		for (const c of this.courses) {
			c.language = DataManager.findLanguage(Number(c.language)).name;
		}

		this.renderCourses(this.courses);
	}

	renderCourses(courses) {
		this.coursesList.innerHTML = '';
		const coursesByLanguages = {};

		for (const c of courses) {
			coursesByLanguages[c.language] ??= [];
			coursesByLanguages[c.language].push(c);
		}

		for (const l of Object.keys(coursesByLanguages)) {
			const courses = coursesByLanguages[l];

			this.append({
				className: 'courses-by-language',
				children: [{
					className: 'language',
					textContent: l
				},{
					className: 'list',
					children: courses.map(c => ({
						className: 'course',
						'on:click': () => ROUTER.pushRoute(`/courses/${c.id}/mode`),
						children: [{
							className: 'word-count',
							textContent: `${c.words} ${i18n._(!c.words ? 'no_word' : `word${c.words === 1 ? '' : 's'}`)}`
						},{
							className: 'rating',
							children: [{textContent: `(${c.rating || '-'})`}, 'icon:star']
						},{
							className: 'folder-add',
							children: ['icon:folder-plus'],
							'on:click': e => {
								e.stopPropagation();
								new AddToFolderDialog(document.body, {
									id: c.id
								});
							}
						},{
							textContent: c.name
						}]
					}))
				}]
			}, null, this.coursesList);
		}
	}
}

class Tutorial extends Sword {
	beforeRender() {
		this.heading = '';
		this.text = '';
		this.idx = null;
	}

	render() {
		const sections = [{
			name: 'Introduction',
		},{
			name: 'Courses',
		},{
			name: 'Adventure mode',
		}]

		this.el = this.createElement({
		    children: [{
                class: AppHeader
            },{
				className: 'content',
				children: [{
					className: 'head',
					children: sections.map((s, i) => {
						return {
							nodeName: 'a',
							href: `/tutorial/${i}`,
							className: 'section',
							'on*:click': () => ROUTER.pushRoute(`/tutorial/${i}`),
							children: [{
								className: 'order',
								textContent: i18n._(i + 1)
							},{
								className: 'name',
								textContent: i18n._(s.name)
							}]
						}
					})
				},{
					nodeName: 'h3',
					className: 'chapter',
					textContent: this.heading
				},{
					className: 'description',
					children: this.text
				}]
		    },{
			    className: 'actions',
			    children: [{
				    render: this.idx > 0,
				    nodeName: 'button',
				    type: 'button',
				    children: ['icon:arrow-left', {textContent: i18n._('back')}],
				    className: 'primary icon-left',
				    'on*:click': () => ROUTER.pushRoute(`/tutorial/${(this.idx - 1)}`)
				},{

                	render: this.idx === 2,
                    nodeName: 'button',
                    type: 'button',
                    children: [{textContent: i18n._('go_adventures_tutorial')}, 'icon:arrow-right'],
                    className: 'primary icon-right go-adventure',
                    'on*:click': () => ROUTER.pushRoute(Routes.adventures)
    		    },{
    		        render: this.idx === 1,
                    nodeName: 'button',
                    type: 'button',
                    children: [{textContent: i18n._('go_courses_tutorial')}, 'icon:arrow-right'],
                    className: 'primary icon-right go-courses',
                    'on*:click': () => ROUTER.pushRoute(Routes.courses)
			    },{
				    render: this.idx < 2,
				    nodeName: 'button',
				    type: 'button',
				    children: [{textContent: i18n._('next')}, 'icon:arrow-right'],
				    className: 'primary icon-right next',
				    'on*:click': () => ROUTER.pushRoute(`/tutorial/${(this.idx + 1)}`)

			    }]
		    }]
        });
	}
}

class Tutorial1 extends Tutorial {
	beforeRender() {
		this.heading = i18n._('tut1_title');
		this.text = [{
			nodeName: 'p',
			textContent: i18n._('tut1_p1'),
		},{
			nodeName: 'p',
			textContent: i18n._('tut1_p2'),
		},{
			nodeName: 'p',
			textContent: i18n._('tut1_p3')
		}];
		this.idx = 0;
	}
}
class Tutorial2 extends Tutorial {
	beforeRender() {
		this.heading = i18n._('tut2_title');
		this.text = [{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p1'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p2'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p3'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p4'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p5'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p6'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p7'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p8'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut2_p9'),
        		}];
		this.idx = 1;
	}
}
class Tutorial3 extends Tutorial {
	beforeRender() {
		this.heading = i18n._('tut3_title');
		this.text = [{
        			nodeName: 'p',
        			textContent: i18n._('tut3_p1'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut3_p2'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut3_p3'),
        		},{
        			nodeName: 'p',
        			textContent: i18n._('tut3_p4'),
        		}];
		this.idx = 2;
	}
}

class FlipCards extends Sword {
	render() {
		this.el = this.createElement({
			'key_ArrowRight': () => {
				if (this.words.length - 1 > this.actualWordIdx) {
					this.showWord(this.actualWordIdx + 1);
				}
			},
			'key_ArrowLeft': () => {
				if (this.actualWordIdx > 0) {
					this.showWord(this.actualWordIdx - 1);
				}
			},
			children: [{
				class: AppHeader
			},{
				ref: 'body',
				className: 'body'
			}]
		}, this);

		this.init();
	}

	async init() {
		this.course = await REST.GET(`courses/${this.id}`);
		this.words = await REST.GET(`courses/${this.id}/nodes/${this.course.node}/words`);
		const actualWord = 0;

		this.append({
			children: [{
				className: 'responsive-header header',
				children: [{
					nodeName: 'h5',
					textContent: this.course.name
				},{
					className: 'word-count',
					children: [{
						nodeName: 'span',
						ref: 'wordCount',
						textContent: actualWord
					},{
						nodeName: 'span',
						textContent: '/' + this.words.length
					}]
				},{
					class: CourseRatingBtn,
					id: this.course.id,
					rating: this.course.rating
				},{
					render: DataManager.session.id === this.course.owner,
					nodeName: 'button',
					className: 'edit secondary icon-left',
					children: ['icon:pencil', i18n._('edit')],
					'on:click': () => ROUTER.pushRoute(Routes.courses_editor + '/' + this.course.id)
				}]
			},{
				ref: 'word',
				className: `word ${this.words.length === 0 ? 'no-words' : ''}`
			},{
				className: 'words-actions',
				children: [{
					nodeName: 'button',
					className: 'secondary icon-left',
					children: ['icon:reset', i18n._('reset')],
					'on:click': () => this.showWord(0)
				},{
					nodeName: 'button',
					className: 'secondary icon-left',
					children: ['icon:refresh', i18n._('shuffle')],
					'on:click': () => {
						this.words = shuffle(this.words);
						this.showWord(0);
						NOTIFICATION.showStandardizedINFO(i18n._('Words have been shuffled'));
					}
				}]
			},{
				ref: 'courseCompleted',
				className: 'course-completed'
			}]
		}, this, this.body);

		if (this.words.isEmpty()) {
			this.noWords();
		} else {
			this.showWord(actualWord);
		}
	}

	courseLastWord() {
		this.replaceChildren(this.actualWordIdx !== this.words.length - 1 ? [] : [{
			className: 'question',
			textContent: i18n._('This is last word in this course. Do you wanna go?')
		},{
			className: 'actions',
			children: [{
				nodeName: 'button',
				className: 'primary back-to-courses',
				textContent: i18n._('Go again'),
				'on:click': () => this.showWord(0)
			},{
				nodeName: 'button',
				className: 'primary back-to-courses',
				textContent: i18n._('Go back to courses list'),
				'on:click': () => ROUTER.pushRoute(Routes.courses)
			}]
		}], null, this.courseCompleted);
	}

	showWord(idx) {
		this.actualWordIdx = idx;
		this.courseLastWord();

		this.wordCount.textContent = idx + 1;
		const word = this.words[idx];
		let definitionDisplayed = false;
		const me = this;

		const wordEl = this.replaceChild({
			ref: 'word',
			className: 'word',
			'on:click': () => {
				const text = wordEl.querySelector('.text');

				this.replaceChildren(definitionDisplayed ? [{
					textContent: word.word,
				}] : [{
					textContent: word.definition,
				},{
					textContent: word.phonetic,
				},{
					textContent: word.translation,
				}], null, text);

				definitionDisplayed = !definitionDisplayed;
			},
			children: [{
				className: 'actions',
				children: [{
					render: DataManager.session.id === this.course.owner,
					nodeName: 'button',
					className: 'edit secondary icon-only',
					children: ['icon:pencil'],
					'on:click': () => new WordCreateDialog(document.body, {
						saveEndpointPrefix: 'courses',
						data: {
							...word,
							group: word.group,
							course: this.course.id
						},
						'on:success': (obj, word) => {
							this.words[idx] = word;
							me.showWord(idx);
						}
					})
				}]
			},{
				className: 'text',
				children: [{
					textContent: word.word,
				}]
			},{
				className: 'buttons',
				children: [{
					disabled: idx === 0,
					nodeName: 'button',
					type: 'button',
					children: ['icon:arrow-left'],
					className: 'primary',
					'on:click': () => this.showWord(idx - 1)
				},{
					disabled: this.words.length - 1 === idx,
					nodeName: 'button',
					type: 'button',
					children: ['icon:arrow-right'],
					className: 'primary',
					'on:click': () => this.showWord(idx + 1)
				}]
			}]
		}, this.word, this);
	}

	noWords() {
		this.replaceChildren([{
			className: 'empty-course-title',
			nodeName: 'h3',
			textContent: i18n._('This course is empty')
		},{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go back to courses list'),
			'on:click': () => ROUTER.pushRoute(Routes.courses)
		}], null, this.word);
	}
}

class CourseRating extends Dialog {
	beforeRender() {
		this.title = i18n._('Course rating');
		this.allowCloseButton = true;
	}

	updateStarsActive(idx, active) {
		for (let i = 0; i <= idx; i++) {
			this[`star-${i}`].classList[active ? 'add' : 'remove']('active');
		}
	}

	async save(rating) {
		await REST.POST(`courses/${this.id}/ratings`, {rating});
		this.close();
		NOTIFICATION.showStandardizedSuccess(i18n._('Thank you for rating this course'));
		this.fire('success', rating);
	}

	renderBody() {
		this.append({
			className: 'course-rating',
			children: [0, 1, 2, 3, 4].map(idx => ({
				ref: `star-${idx}`,
				className: 'star',
				children: ['icon:star'],
				'on:click': async () => await this.save(idx + 1),
				'on:mouseover': () => this.updateStarsActive(idx, true),
				'on:mouseleave': () => this.updateStarsActive(idx, false)
			}))
		}, this, this.bodyEl);

		if (this.rating) {
			this.updateStarsActive(this.rating - 1, true);
		}
	}
}

class WordsGoThrewModeSelect extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				class: AppHeader
			},{
				className: 'title',
				nodeName: 'h3',
				textContent: i18n._('Select mode of going threw words')
			},{
				className: 'modes',
				children: [{
					className: 'mode',
					children: [{
						textContent: 'Test words',
						'on:click': () => ROUTER.pushRoute(`/courses/${this.course}/test-words`)
					}]
				},{
					className: 'course-name',
					ref: 'courseName'
				},{
					className: 'mode',
					children: [{
						textContent: 'Flip cards',
						'on:click': () => ROUTER.pushRoute(`/courses/${this.course}/flip-cards`)
					}]
				}]
			}]
		}, this);

		(async () => {
			this.courseName.textContent = (await REST.GET(`courses/${this.course}`)).name;
		})();
	}
}

class FolderDialog extends Dialog {
	beforeRender() {
		this.title = i18n._(`Folder {folder}`).replace('{folder}', this.folder.name);
		this.allowCloseButton = true;
	}

	noCourses() {
		this.replaceChildren([{
			className: 'empty-folder',
			textContent: i18n._('Folder is empty')
		}], null, this.bodyEl);
	}

	deleteFolder() {
		new ConfirmDialog(document.body, {
			title: i18n._('Are you sure you want to delete this folder?'),
			confirmText: i18n._('yes'),
			cancelText: i18n._('no'),
			onSave: async () => {
				await REST.DELETE(`folders/${this.folder.id}`);
				this.close();
				this.fire('folder-delete', this.folder.id);
				NOTIFICATION.showStandardizedSuccess(i18n._('Folder has been deleted'));
			}
		})
	}

	async renderBody() {
		const courses = await REST.GET(`folders/${this.folder.id}/courses`);

		this.append({
			nodeName: 'button',
			type: 'button',
			className: 'secondary',
			textContent: i18n._('Delete folder'),
			'on:click': async () => this.deleteFolder()
		}, null, this.headerCenterCt)

		if (courses.isEmpty()) {
			this.noCourses();
			return;
		}

		this.append({
			className: 'courses',
			children: courses.map(c => ({
				ref: `course${c.course_id}`,
				className: 'course',
				children: [{
					textContent: c.name,
					'on:click': () => {
						this.close();
						const route = c.type === 'USER' ?
							`/courses/${c.course_id}/mode` :
							`/home/adventures/${c.course_id}`;
						ROUTER.pushRoute(route);
					}
				},{
					className: 'remove-from-folder',
					children: ['icon:folder-minus'],
					'on:click': async () => {
						await REST.DELETE(`folders/${this.folder.id}/course/${c.course_id}`);
						this[`course${c.course_id}`].remove();
						courses.deleteByIndex(c => c.id === c.course_id);

						if (courses.isEmpty()) {
							this.noCourses();
						}
					}
				}]
			}))
		}, this, this.bodyEl);
	}
}

class Dashboard extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				className: 'statistics',
				children: [{
					className: 'learnedMinutes',
					children: [{
						nodeName: 'h4',
						textContent: i18n._('Learned minutes today')
					},{
						ref: 'learnedMinutes'
					}]
				},{
					className: 'knownWords',
					children: [{
						nodeName: 'h4',
						textContent: i18n._('Number of known words today')
					},{
						ref: 'knownWords'
					}]
				},{
					className: 'dayStreak',
					children: [{
						nodeName: 'h4',
						textContent: i18n._('Day streak')
					},{
						ref: 'dayStreak'
					}]
				}]
			},{
				className: 'folders',
				children: [{
					nodeName: 'h4',
					textContent: i18n._('Your folders')
				},{
					className: 'list',
					ref: 'foldersList'
				}]
			},{
				className: 'courses-adventures flex',
				children: [{
					className: 'lastCourses',
					children: [{
						nodeName: 'h4',
						textContent: i18n._('Last courses')
					},{
						className: 'courseList',
						ref: 'coursesList'
					}]
				},{
					className: 'lastAdventure',
					children: [{
						nodeName: 'h4',
						textContent: i18n._('Last adventures')
					},{
						className: 'adventures',
						ref: 'adventures'
					}]
				}]
			}]
		}, this);

		this.init();
	}

	async init() {
		const today = new Date();
		const dateFormatted = [today.getMonth() + 1, today.getDate(), today.getFullYear()].join('-');

		this.courses = await REST.GET(`courses/list?interactions=true&limit=5`);
		const adventure = await REST.GET(`adventures/list?interactions=true&limit=5`);
		this.learningTime = await REST.GET(`statistics/learning_time?from=${dateFormatted}`);
		const knownWords = await REST.GET(`statistics/words_known`);
		const dayStreak = await REST.GET(`statistics/daystreak`);
		this.folders = await REST.GET(`folders`);

		this.knownWords.textContent = knownWords;
		this.dayStreak.textContent = dayStreak;

		this.renderCourses();
		this.renderFolders();
		this.renderLearnedMinutes();

		for (const a of adventure) {
			this.append({
				'on:click': () => ROUTER.pushRoute(Routes.adventures + '/' + a.id),
				children: [{
					nodeName: 'h5',
					textContent: a.name
				},{
					textContent: DataManager.findLanguage(a.language).name
				}]
			}, null, this.adventures)
		}
	}

	renderFolders() {
		if (this.folders.isEmpty()) {
			this.append({
				className: 'no-folders',
				textContent: i18n._('You don\' have any folders yet')
			}, null, this.foldersList);
			return;
		}

		for (const f of this.folders) {
			const folder = this.append({
				className: 'folder',
				children: [{
					textContent: f.name,
					'on:click': () => new FolderDialog(document.body, {
						folder: f,
						'on:folder-delete': () => folder.remove()
					})
				},{
					className: 'courses-count',
					textContent: i18n._(`{courses} ${f.courses === 1 ? 'course' : 'courses'}`).replace('{courses}', f.courses || 0)
				}]
			}, null, this.foldersList);
		}
	}

	renderLearnedMinutes() {
		this.learnedMinutes.textContent = !this.learningTime ?
			i18n._('You have not learned yet') :
			`${((this.learningTime.hours || 0) * 60 + (this.learningTime.minutes || 0) + (this.learningTime.seconds || 0) / 60).toFixed(2)} ${i18n._('minutes')}`;
	}

	renderCourses() {
		if (this.courses.isEmpty()) {
			this.append({
				className: 'go-to-tutorial',
				children: [{
					nodeName: 'h5',
					textContent: i18n._('Don\'t know where to go?')
				}, {
					nodeName: 'button',
					className: 'primary',
					textContent: i18n._('Go quickly threw our tutorial')
				}],
				'on:click': () => ROUTER.pushRoute(Routes.tutorial)
			}, null, this.coursesList);
		}

		for (const c of this.courses) {
			this.append({
				'on:click': () => ROUTER.pushRoute(`/courses/${c.id}/mode`),
				children: [{
					nodeName: 'h5',
					textContent: c.name
				}, {
					textContent: DataManager.findLanguage(c.language).name
				}]
			}, null, this.coursesList)
		}
	}
}