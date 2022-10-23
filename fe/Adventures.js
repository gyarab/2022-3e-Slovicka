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
		} catch (ignored) {}
	}

	async onSave(data) {
		const id = this.data?.id;
		const newNode = !id;

		if (newNode) {
			data.level = Number(this.level) || 0;
		}

		this.data = await REST[id ? 'PUT' : 'POST'](`adventures/${this.course}/node${id ? '/' + id : ''}`, data);

		NOTIFICATION.showStandardizedSuccess(i18n._(newNode ? 'Node saved' : 'Node updated'));

		if (newNode) {
			const url = new URL(Routes.adventure_node_editor + '/' + this.data.course + '/' + this.data.id, location.href)
			history.pushState({}, '', url.toString());

			this.publishBtn.disabled = false;
			this.deleteBtn.disabled = false;
		}
	}

	handleError(ex) {
		NOTIFICATION.showStandardizedError({
			max_nodes_level: i18n._('There can be only three nodes at one level'),
			number_of_completion_min: i18n._('Number of completions must be higher than 0'),
			negative_level: i18n._('Level cannot be lower than 0')
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
		}]
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

	publishNodeDialog() {
		const me = this;

		new ConfirmDialog(document.body, {
			title: i18n._('Are you sure you want to publish this node?'),
			subtitle: i18n._('This is only one was operation and cannot be undone. After publishing node cannot be back in state creating.'),
			cancelText: i18n._('no'),
			submitText: i18n._('yes'),
			async onSave() {
				await REST.PUT(`adventures/${me.data.course}/node/${me.data.id}/publish`);

				me.publishBtn.remove();
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

class AdventureNodesEditor extends Sword {
	id = null;

	render() {
		this.el = this.createElement({
			children: [{
				class: AppHeader,
			},{
				className: 'body',
				children: [{
					textContent: i18n._('')
				},{
					className: 'nodes-list',
					ref: 'nodesList'
				}]
			}]
		}, this);

		this.loadAdventure();
	}

	async loadAdventure() {
		try {
			const nodes = await REST.GET(`adventures/${this.id}/node/list`);
			this.nodes = {};

			for (const n of nodes) {
				this.nodes[n.level] ??= [];
				this.nodes[n.level].push(n);
			}

			this.renderNodes();
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

	getNewNodeConf(level) {
		return {
			children: [{
				className: 'icon',
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
		};
	}

	renderNodes() {
		this.nodesList.innerHTML = '';

		for (const [level, row] of Object.entries(this.nodes)) {
			const children = []

			for (let i = 0; i < row.length; i++) {
				const n = row[i];

				children.push({
					'on:click': () => ROUTER.pushRoute(`${Routes.adventure_node_editor}/${this.id}/${n.id}`),
					children: [{
						className: 'icon',
						children: ['icon:pencil']
					}, {
						textContent: n.name
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
				className: 'row',
				children
			}, null, this.nodesList);
		}

		this.append({
			className: 'row',
			children: Array(3).fill(this.getNewNodeConf(Object.keys(this.nodes).length))
		}, null, this.nodesList);
	}
}

