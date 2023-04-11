class PageNotFound extends Sword {
	render() {
		this.el = this.createElement({
			className: 'screen page-not-found',
			children: [this.useIcon(), {
				textContent: 'Je nám líto, ale tato stránka nebyla nalezena'
			},{
				nodeName: 'a',
				textContent: 'Zpět na domovskou obrazovku',
				'on:click': () => ROUTER.pushRoute(Routes.home)
			}]
		})
	}
}

class SectionScreen extends Sword {
	defaultSection = null;
	getRoutes() {}
	getSidebarMenu() {}
	getHeader() {}

	render() {
		this.renderSideBar ??= true;

		this.el = this.createElement({
			className: 'layout',
			children: [this.getHeader(), {
				render: this.renderSideBar,
				className: 'sidebar',
				children: [{
					className: 'vertical-menu',
					ref: 'sidebarEl'
				}]
			},{
				className: 'body',
				ref: 'bodyEl'
			}]
		}, this);

		this.resolveSection();
		if (this.renderSideBar) {
			this.updateSidebarMenu();
		} else {
			this.renderSection();
		}
	}

	resolveSection() {
		const section = this.getRoutes()[this.section];

		if (!section) {
			ROUTER.pushRoute(this.defaultSection);
			this.currentSection = this.defaultSection;
		} else {
			this.currentSection = section;
		}
	}

	renderSection() {
		for (const item of this.getSidebarMenu()) {
			if (this.currentSection === item.href) {
				this.append({
					class: item.screen,
					data: item?.getScreenData && item.getScreenData()
				}, null, this.bodyEl);

				item?.updateBody && item.updateBody();
			}
		}
	}

	updateSidebarMenu() {
		let menu = this.getSidebarMenu();

		for (const item of menu) {
			if (!item['on:click'] && !item.notAddOnClick) {
				item['on:click'] = async e => {
					e.preventDefault();

					if (item.href === window.location.pathname) {
						return;
					}

					this.bodyEl.innerHTML = '';

					ROUTER.pushRoute(item.href);
				}
			}

			const itemToRender = {...item};
			delete itemToRender.screen
			const section = this.append(itemToRender, null, this.sidebarEl);

			if (this.currentSection === item.href) {
				this.append({
					class: item.screen,
					data: item?.getScreenData && item.getScreenData()
				}, null, this.bodyEl);

				item?.updateBody && item.updateBody();

				section.classList.add('active');
			}
		}
	}
}


class SmartTableScreen extends Sword {
	title = '';
	listEndpoint = '';

	getColumns() {}

	async render() {
		this.el = this.createElement({
			className: 'panel-container',
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h4',
					textContent: i18n._(this.title)
				}]
			},{
				class: SmartTable,
				ref: 'table',
				getColumns: () => this.getColumns()
			}]
		}, this);
	}

	async loadData() {
		this.data = await REST.GET(this.listEndpoint);
		this.table.setData(this.data);
	}

	add(item) {
		this.data.push(item);
		this.table.setData(this.data);
	}
}