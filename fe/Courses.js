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
		this.el = this.createElement({
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h3',
					textContent: i18n._('courses')
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
				className: 'courses',
				ref: 'coursesList'
			}]
		}, this);

		this.loadCourses();
	}

	async loadCourses() {
		this.courses = await REST.GET('courses/list?withRatings=true');
		const coursesByLanguages = {};

		for (const c of this.courses) {
			coursesByLanguages[c.language] ??= [];
			coursesByLanguages[c.language].push(c);
		}

		for (const l of Object.keys(coursesByLanguages)) {
			const courses = coursesByLanguages[l];

			this.append({
				className: 'courses-by-language',
				children: [{
					className: 'language',
					textContent: DataManager.findLanguage(Number(l)).name
				},{
					className: 'list',
					children: courses.map(c => ({
						className: 'course',
						'on:click': () => ROUTER.pushRoute(Routes.flipCards + '/' + c.id),
						children: [{
							className: 'rating',
							children: [{textContent: `(${c.rating || '-'})`}, 'icon:star']
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
                    children: [{textContent: i18n._('go-adventure')}, 'icon:arrow-right'],
                    className: 'primary icon-right go-adventure',
                    'on*:click': () => ROUTER.pushRoute(Routes.adventures)
    		    },{
    		        render: this.idx === 1,
                    nodeName: 'button',
                    type: 'button',
                    children: [{textContent: i18n._('go-courses')}, 'icon:arrow-right'],
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
		this.heading = 'Introduction';
		this.text = [{
			nodeName: 'p',
			textContent: 'tut1_p1',
		},{
			nodeName: 'p',
			textContent: 'tut1_p2',
		}];
		this.idx = 0;
	}
}
class Tutorial2 extends Tutorial {
	beforeRender() {
		this.heading = 'Courses';
		this.text = [{
        			nodeName: 'p',
        			textContent: 'tut2_p1',
        		},{
        			nodeName: 'p',
        			textContent: 'tut2_p2',
        		}];
		this.idx = 1;
	}
}
class Tutorial3 extends Tutorial {
	beforeRender() {
		this.heading = 'Adventures';
		this.text = [{
        			nodeName: 'p',
        			textContent: 'tut3_p1',
        		},{
        			nodeName: 'p',
        			textContent: 'tut3_p2',
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
		const me = this;

		this.append({
			children: [{
				className: 'header',
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
					nodeName: 'button',
					className: 'rate secondary icon-left',
					ref: 'ratingBtn',
					children: [this.course.rating ? this.course.rating + '' : '-', 'icon:star', i18n._('rate')],
					'on:click': () => new CourseRating(document.body, {
						id: this.course.id,
						rating: this.course.rating,
						'on:success': (obj, rating) => {
							this.course.rating = rating;
							me.replaceChildren([this.course.rating ? this.course.rating + '' : '-', 'icon:star', i18n._('rate')], null, this.ratingBtn)
						}
					})
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