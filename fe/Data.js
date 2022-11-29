class AppDataManager extends Sword {
	render() {
		this.session = null;
		this.components = [];

		this.el = this.createElement({});

		this.languages = [];
		this.languageMap = {};

		this.io = io({autoConnect: false});

		this.attachSocketEvents();
	}

	attachSocketEvents() {}

	async getLanguages() {
		this.languages = await REST.GET('languages/list');

		for (const l of this.languages) {
			this.languageMap[l.id] = l.name;
		}
	}

	findLanguage(id) {
		return this.languages.find(l => l.id === id);
	}

	async login(data) {
		this.session = await REST.POST('session', data);
		await this.io.connect();
		return this.session;
	}

	userIsAdmin() {
		return this.session?.role === 'ADMIN';
	}

	userIsEditor() {
		return this.session?.role === 'EDITOR';
	}

	userIsAtLeastEditor() {
		return this.session?.role === 'EDITOR' || this.session?.role === 'ADMIN';
	}

	userIsNotAdmin() {
		return this.session?.role !== 'ADMIN' && this.session?.role !== 'EDITOR';
	}

	getSession() {
		return this.session;
	}

	hasSession() {
		return this.session != null;
	}

	async logout() {
		await REST.DELETE('session');
		this.session = null;
		this.io.disconnect();
	}

	async initSession() {
		try {
			this.session = await REST.GET('session');
			await this.getLanguages();
			await this.io.connect();
		} catch (ignored) {
		}

		return this.session;
	}

	async updateUserInfo(data) {
		const update = await REST.PUT('users', data);

		this.session = {
			...this.session,
			...update
		}

		this.fire('session-update')

		return update;
	}

	async changeLang(lang) {
		this.session.lang = await REST.PUT('users/lang-change', {lang});
		await i18n.changeLang(lang);
	}
}