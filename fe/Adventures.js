function shuffle(arr) {
	for (let i = 0; i < arr.length; i++) {
		const idx = Math.floor(Math.random() * arr.length);
		const itemA = arr[idx];
		arr[idx] = arr[i];
		arr[i] = itemA;
	}

	return arr;
}

class AdventureNodeEditor extends CourseNodeEditor {
	beforeRender() {
		this.wordEndpointPrefix = 'adventures';
	}

	async loadData() {
		try {
			if (this.node) {
				this.data = await REST.GET(`adventures/${this.course}/node/${this.node}`);
				this.nodeInfo.setFormValues(this.data);
				await this.loadWords();
			}

			this.setNodeImage({
				id: this.data?.picture,
				name: this.data?.picture_name
			});
		} catch (ignored) {}
	}

	disableWhenPublished() {
		this.addWordBtn.disabled = true;
		this.nodeInfo.disableForm(true);
		this.renderWords();
	}

	async onSave(data) {
		const id = this.data?.id;
		const newNode = !id;

		if (newNode) {
			data.level = Number(this.level) || 0;
		}

		this.data = await REST[id ? 'PUT' : 'POST'](`adventures/${this.course}/node${id ? '/' + id : ''}`, {
			...data,
			picture: this.selectedImage.id
		});

		NOTIFICATION.showStandardizedSuccess(i18n._(newNode ? 'Node saved' : 'Node updated'));

		if (newNode) {
			const url = new URL(Routes.adventure_node_editor + '/' + this.data.course + '/' + this.data.id, location.href)
			history.pushState({}, '', url.toString());

			this.deleteBtn.disabled = false;
		}
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			max_nodes_level: i18n._('There can be only three nodes at one level'),
			number_of_completion_min: i18n._('Number of completions must be higher than 0'),
			negative_level: i18n._('Level cannot be lower than 0'),
			published_node: i18n._('Published node cannot be edited')
		}[ex.code]);
	}

	getFields() {
		return [{
			class: TextField,
			type: 'number',
			name: 'number_of_completion',
			label: 'Required number of completion',
			handleKeydown(e) {
				if (!/[0-9]+/.test(e.key)) {
					e.preventDefault();
				}
			}
		},{
			'on:click': () => new AddImageCourseNode(document.body, {
				'on:image': (obj, image) => {
					this.selectedImage = image;
					this.setNodeImage(this.selectedImage);
				}
			}),
			ref: 'nodeImage',
 			className: 'adventure-node-picture',
		}]
	}

	setNodeImage(picture) {
		if (!picture.id) {
			this.replaceChildren([{
				textContent: i18n._('Click for selecting node image')
			}], null, this.nodeInfo.nodeImage)
			return;
		}

		this.replaceChildren([{
			nodeName: 'img',
			src: `/api/adventures/node-picture/${picture.id}`
		},{
			textContent: picture.name
		}], null, this.nodeInfo.nodeImage);
	}

	deleteNodeDialog() {
		const me = this;

		new ConfirmDialog(document.body, {
			title: i18n._('Do you really want to delete this node?'),
			cancelText: i18n._('cancel'),
			submitText: i18n._('delete'),
			async onSave() {
				await REST.DELETE(`adventures/${me.data.course}/node/${me.data.id}`);

				NOTIFICATION.showStandardizedSuccess(i18n._('Node was successfully deleted'));
				ROUTER.pushRoute(Routes.adventure_editor + '/' + me.course);
			},
			handleError(ex) {
				NOTIFICATION.showStandardizedError({
					node_not_found: i18n._('Node not found'),
					last_node: i18n._('This is last node on this level, thus cannot be deleted')
				}[ex.code]);
			}
		})
	}

	onWordInsert() {
		this.publishBtn.disabled = false;
	}

	publishNodeDialog() {
		const me = this;

		new ConfirmDialog(document.body, {
			title: i18n._('Are you sure you want to publish this node?'),
			subtitle: i18n._('This is only one was operation and cannot be undone. After publishing node cannot be back in state creating.'),
			cancelText: i18n._('no'),
			submitText: i18n._('yes'),
			async onSave() {
				await REST.PUT(`adventures/${me.data.course}/node/${me.data.id}/publish`);

				me.data.state = 'published';
				me.publishBtn.remove();
				me.disableWhenPublished();
			},
			handleError(ex) {
				NOTIFICATION.showStandardizedError({
					node_not_found: i18n._('Node not found'),
				}[ex.code]);
			}
		})
	}

	renderHeader() {
		this.replaceChildren([{
			nodeName: 'button',
			children: ['icon:plus', {textContent: i18n._('go_back')}],
			className: 'primary icon-left',
			'on:click': () => ROUTER.pushRoute(Routes.adventure_editor + '/' + this.course)
		},{
			nodeName: 'h4',
			className: 'title',
			textContent: i18n._('Node editor')
		},{
			render: this.data?.state !== 'published',
			disabled: !this.data?.id,
			ref: 'publishBtn',
			nodeName: 'button',
			children: ['icon:plus', {textContent: i18n._('publish')}],
			className: 'primary icon-left',
			'on:click': () => this.publishNodeDialog()
		},{
			disabled: !this.data?.id,
			ref: 'deleteBtn',
			nodeName: 'button',
			children: ['icon:delete', {textContent: i18n._('delete')}],
			className: 'primary icon-left',
			'on:click': () => this.deleteNodeDialog()
		}], this, this.header);
	}
}

class CourseRatingBtn extends Sword {
	id;
	rating;

	render() {
		const me = this;

		this.el = this.createElement({
			nodeName: 'button',
			className: 'rate secondary icon-left',
			children: [this.rating ? this.rating + '' : '-', 'icon:star', i18n._('rate')],
			'on:click': () => new CourseRating(document.body, {
				id: this.id,
				rating: this.rating,
				'on:success': (obj, rating) => {
					this.rating = rating;
					me.replaceChildren([this.rating ? this.rating + '' : '-', 'icon:star', i18n._('rate')], null, this.el)
				}
			})
		});
	}
}

class AdventureNodesEditor extends Sword {
	id = null;

	render() {
		this.el = this.createElement({
			children: [{
				class: AppHeader,
			},{
				ref: 'adventureHeader'
			},{
				className: 'body',
				children: [{
					textContent: i18n._('')
				},{
					className: 'nodes',
					ref: 'nodesList'
				}]
			}]
		}, this);

		this.loadAdventure();
	}

	async loadAdventure() {
		try {
			this.adventure = await REST.GET(`adventures/${this.id}`);
			const nodes = await REST.GET(`adventures/${this.id}/node/list`);
			this.nodes = {};

			for (const n of nodes) {
				this.nodes[n.level] ??= [];
				this.nodes[n.level].push(n);
			}

			this.renderNodes();
			this.renderHeader();
		} catch (ex) {
			new ConfirmDialog(document.body, {
				title: i18n._('Course not found'),
				subtitle: i18n._('We are really sorry but this adventure does not seem to exist.'),
				cancelText: false,
				confirmText: i18n._('Go back on adventures administration'),
				onSave: () => ROUTER.pushRoute(Routes.administration_adventures)
			})
		}
	}

	renderHeader() {
		const me = this;

		this.append({
			className: 'adventure-header',
			children: [{
				nodeName: 'button',
				type: 'button',
				children: ['icon:arrow-left', {textContent: i18n._('back')}],
				className: 'primary icon-left',
				'on:click': () => ROUTER.pushRoute(Routes.administration_adventures)
			},{
				nodeName: 'h5',
				textContent: this.adventure.name,
				ref: 'adventureName'
			},{
				nodeName: 'button',
				type: 'button',
				children: ['icon:pencil', {textContent: i18n._('edit_adventure')}],
				className: 'primary icon-left',
				'on:click': async () => new AdventureAdministrationFrom(document.body, {
					data: this.adventure,
					'on:success': (obj, adventure) => {
						me.adventure = adventure;
						me.adventureName.textContent = adventure.name;
					}
				})
			}]
		}, me, this.adventureHeader);
	}

	getNewNodeConf(level) {
		return {
			children: [{
				className: 'node',
				children: [{
					className: 'state-icon',
					children: ['icon:plus']
				}],
				'on:click': () => ROUTER.route({
					path: `${Routes.adventure_node_editor}/${this.id}`,
					paramsFn: () => {
						const params = new URLSearchParams();
						params.append('level', level);
						return params;
					},
					mode: 'push',
				})
			}]
		};
	}

	renderNodes() {
		this.nodesList.innerHTML = '';

		for (const [level, row] of Object.entries(this.nodes)) {
			const children = []

			for (let i = 0; i < row.length; i++) {
				const n = row[i];

				children.push({
					children: [{
						className: 'node',
						'on:click': () => ROUTER.pushRoute(`${Routes.adventure_node_editor}/${this.id}/${n.id}`),
						children: [{
							className: 'state-icon',
							children: ['icon:pencil']
						}, {
							textContent: n.name
						}]
					}]
				})
			}

			if (row.length === 1) {
				children.splice(0, 0, this.getNewNodeConf(level))
			}

			if (row.length < 3) {
				children.push(this.getNewNodeConf(level));
			}

			this.append({
				className: 'level',
				children
			}, null, this.nodesList);
		}

		this.append({
			className: 'level',
			children: Array(3).fill(this.getNewNodeConf(Object.keys(this.nodes).length))
		}, null, this.nodesList);
	}
}

class AdventureNodes extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				class: AppHeader
			},{
				className: 'nodes-header',
				ref: 'header'
			},{
				className: 'nodes',
				ref: 'nodesList'
			}]
		}, this);

		this.init();
	}

	async init() {
		try {
			this.adventure = await REST.GET(`adventures/${this.id}`);
			this.nodes = await REST.GET(`adventures/${this.id}/nodes`);

			this.replaceChildren([{
				nodeName: 'h5',
				textContent: this.adventure.name
			},{
				class: CourseRatingBtn,
				id: this.adventure.id,
				rating: this.adventure.rating
			}], null, this.header);

			this.renderNodes();
		} catch (ex) {
			NOTIFICATION.showStandardizedError();
		}
	}

	renderNodes() {
		const nodes = {};
		const levelsCompletion = {};

		for (const n of this.nodes) {
			const completed = n.completed || 0;
			const levelCompleted = n.number_of_completion <= completed;

			levelsCompletion[n.level] ??= true;
			levelsCompletion[n.level] = levelsCompletion[n.level] && levelCompleted;

			const unlocked = n.level === 0 || levelsCompletion[n.level - 1] === true;

			nodes[n.level] ??= [];
			nodes[n.level].push({
				children: [{
					className: 'node',
					'on:click': () => {
						if (unlocked) {
							ROUTER.pushRoute(`/adventures/${this.id}/test-words/${n.id}`);
						} else {
							NOTIFICATION.showStandardizedINFO(i18n._(`You have to complete level before first.`))
						}
					},
					children: [{
						className: 'state-icon',
						children: [this.useIcon(levelCompleted ? 'check' : (unlocked ? 'un' : '') + 'lock')]
					},{
						textContent: n.name
					},{
						textContent: completed + '/' + n.number_of_completion
					}]
				}]
			});
		}

		for (const level of Object.values(nodes)) {
			this.append({
				className: 'level',
				children: level
			}, null, this.nodesList)
		}
	}
}

class Adventures extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h3',
					textContent: i18n._('adventures')
				},{
					class: SearchInput,
					onInputHandler: search => {
						const filtered = Utils.filterRows(search, this.adventures, ['name', 'language', 'description'], 'name');
						this.renderAdventures(filtered);
					}
				}]
			},{
				ref: 'adventuresEl',
				className: 'adventures'
			}]
		}, this);

		this.init();
	}

	async init() {
		this.adventures = await REST.GET(`adventures/list?withRatings=true`);

		for (const a of this.adventures) {
			a.language = DataManager.findLanguage(a.language).name;
		}

		this.renderAdventures(this.adventures);
	}

	renderAdventures(adventures) {
		this.adventuresEl.innerHTML = '';

		for (const a of adventures) {
			this.append({
				className: 'adventure',
				'on:click': () => ROUTER.pushRoute(Routes.adventures + '/' + a.id),
				children: [{
					textContent: a.name
				},{
					className: 'description',
					textContent: a.description
				},{
					className: 'left-corner-info',
					children: [{
						className: 'language',
						textContent: a.language
					},{
						className: 'rating',
						children: [{textContent: `(${a.rating || '-'})`}, 'icon:star']
					}]
				}]
			}, null, this.adventuresEl);
		}
	}
}

class WordKnownSuccessDialog extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				className: 'success-checkmark',
				children: [{
					className: 'check-icon',
					children: [{
						className: 'icon-line line-tip'
					},{
						className: 'icon-line line-long success'
					},{
						className: 'icon-circle'
					},{
						className: 'icon-fix'
					}]
				}]
			}]
		});

		setTimeout(() => {
			this.cb();
			this.destroy();
		}, 2 * 1000);
	}
}

class WordKnownFailDialog extends Sword {
	render() {
		this.el = this.createElement({
			children: [{
				className: 'fail-checkmark',
				children: [{
					className: 'check-icon error',
					children: [{
						className: 'icon-line line-long error'
					},{
						className: 'icon-line line-long-error'
					},{
						className: 'icon-circle'
					},{
						className: 'icon-fix'
					}]
				}]
			}]
		})

		setTimeout(() => {
			this.cb();
			this.destroy();
		}, 2 * 1000);
	}
}

class CompletedPopup extends Sword {
	mainText;
	buttons;

	render() {
		this.el = this.createElement({
			'on:click': () => {
				this.fire('go-again');
				this.destroy();
			},
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				className: 'wrap',
				children: [{
					nodeName: 'h2',
					textContent: i18n._('Congratulations!!!')
				},{
					nodeName: 'h4',
					textContent: i18n._(this.mainText)
				},{
					className: 'actions',
					children: this.buttons
				},{
					className: 'canvas',
					nodeName: 'canvas',
					ref: 'canvas'
				}]
			}]
		}, this);
	}

	connect() {
		const confetti = new ConfettiGenerator({
			target: this.canvas,
			max: 120
		});
		confetti.render();
	}
}

class CourseCompleted extends CompletedPopup {
	beforeRender() {
		this.buttons = [{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go again threw course'),
			'on:click': () => {
				this.fire('go-again');
				this.destroy();
			}
		},{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go back to courses list'),
			'on:click': () => ROUTER.pushRoute(Routes.courses)
		}];
		this.mainText = 'You have successfully completed course \n Where do you want to go?';
	}
}

class AdventureCompleted extends CompletedPopup {
	beforeRender() {
		const completed = this.completed === this.required;

		this.buttons = [{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go again threw node'),
			'on:click': () => {
				this.fire('go-again');
				this.destroy();
			}
		},{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go to adventure nodes'),
			'on:click': () => ROUTER.pushRoute(`/home/adventures/${this.id}`)
		},{
			nodeName: 'button',
			className: 'primary back-to-courses',
			textContent: i18n._('Go to adventures list'),
			'on:click': () => ROUTER.pushRoute(Routes.adventures)
		}];
		this.mainText = completed ?
			'You have successfully completed adventure node \n Where do you want to go?' :
			`You have successfully completed adventure node ${this.completed}/${this.required} times`;
	}
}

class TestWords extends Sword {
	id;

	async render() {
		this.el = this.createElement({
			children: [{
				class: AppHeader
			},{
				className: 'body',
				ref: 'body'
			}]
		}, this);

		await this.init();
		this.renderBody();
	}

	getData() {}
	showEndingPopup() {}

	async init() {
		await this.getData();
		this.notKnown = [];

		for (const w of this.words) {
			if (!w.known_times || Number(w.known_times) === this.course.number_of_completion) {
				this.notKnown.push(w);
			}
		}

		this.notKnown = shuffle(this.notKnown);
	}

	renderBody() {
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
						textContent: (this.words.length - this.notKnown.length) + 1
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
				className: 'card',
				ref: 'card'
			}]
		}, this, this.body);

		this.renderCard(this.notKnown[0]);
	}

	reset() {
		this.notKnown = [...this.words];
		this.wordCount.textContent = 1;
		this.renderCard(this.notKnown[0]);
	}

	renderCard(word) {
		const getRandomWord = () => this.words[Math.floor(Math.random() * this.words.length)];
		const randomAnswers = shuffle([word, getRandomWord(), getRandomWord(), getRandomWord()]);

		this.replaceChildren([{
			className: 'word',
			textContent: word.word
		},{
			className: 'translations',
			children: randomAnswers.map(a => ({
				nodeName: 'button',
				render: !!a.translation,
				className: 'translation',
				textContent: a.translation,
				'on:click': async e => {
					const notKnown = word.id !== a.id;
					await REST.POST(`courses/${this.id}/words/${word.group}/state`, {
						state: notKnown ? 'unknown' : 'known'
					});

					if (notKnown) {
						this.wordSelectedUnsuccessfully();
					} else {
						this.wordSelectedSuccessfully();
					}
				}
			}))
		}], this, this.card);
	}

	wordSelectedUnsuccessfully() {
		const testedWord = this.notKnown.shift();

		new WordKnownFailDialog(document.body, {
			cb: () => this.renderCard(this.notKnown[0])
		});
		this.notKnown.push(testedWord);
	}

	wordSelectedSuccessfully() {
		this.notKnown.shift();
		this.course.number_of_completion++;

		if (this.notKnown.length === 0) {
			this.showEndingPopup();
		} else {
			new WordKnownSuccessDialog(document.body, {
				cb: () => this.renderCard(this.notKnown[0])
			});

			this.wordCount.textContent = 1 + (this.words.length - this.notKnown.length);
		}
	}
}

class TestWordsCourses extends TestWords {
	async getData() {
		this.course = await REST.GET(`courses/${this.id}`);
		this.words = await REST.GET(`courses/${this.id}/nodes/${this.course.node}/words`)
	}

	showEndingPopup() {
		new CourseCompleted(document.body, {
			'on:go-again': () => this.reset()
		});
	}
}

class TestWordsAdventures extends TestWords {
	async getData() {
		this.course = await REST.GET(`adventures/${this.id}/nodes/${this.node}`);
		this.words = await REST.GET(`courses/${this.id}/nodes/${this.course.node}/words`)
	}

	showEndingPopup() {
		new AdventureCompleted(document.body, {
			'on:go-again': () => this.reset(),
			id: this.id,
			completed: this.course.number_of_completion,
			required: this.course.required_number_of_completion
		});
	}
}