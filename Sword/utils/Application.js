class Application extends Sword {
	beforeRender() {
		this.isMobileUIValue = null;
		this.inits = null;
	}

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			className: 'application',
			'data_route': '/',
			'data_state': 'loading'
		});
	}

	show(config) {
		for (const c of this.children) {
			if (c instanceof Sword) {
				c.destroy();
			} else {
				c.remove();
			}
		}

		return this.append(config);
	}

	isMobileUIDetected() {
		// if user can't hover or has thick fingers, then we show mobile UI
		return matchMedia('(hover: none)').matches
			|| matchMedia('(pointer: coarse)').matches;
	}

	isMobileUI() {
		return this.isMobileUIValue;
	}

	getForcedUIVariant() {
		return localStorage.getItem('ui-variant');
	}

	connect() {
		// detect mobile UI
		this.isMobileUIValue = this.isMobileUIDetected();

		let variant = this.getForcedUIVariant();

		if (variant === 'mobile') {
			this.isMobileUIValue = true;
		} else if (variant === 'desktop') {
			this.isMobileUIValue = false;
		}

		document.documentElement.classList.add(this.isMobileUI() ? 'mobile-ui' : 'desktop-ui');
		document.body.classList.add(`browser-${BrowserUtils.resolveBrowser()}`);

		this.addExternalListener('popstate', window, ev => ROUTER.resolveCurrentRoute());

		// run init functions
		for (let cb of (this.inits || [])) {
			cb();
		}

		this.resolveTheme();
	}

	setDocumentTheme(theme) {
		if (!theme) {
			delete document.documentElement.dataset.theme
			localStorage.removeItem('ui-theme');
		} else {
			document.documentElement.dataset.theme = theme;
			localStorage.setItem('ui-theme', theme);
		}
	}

	getDocumentTheme() {
		return document.documentElement.dataset.theme;
	}

	resolveTheme() {
		let theme = localStorage.getItem('ui-theme');
		if (theme && ['light', 'dark'].includes(theme)) {
			document.documentElement.classList.toggle('no-transitions', true);
			document.documentElement.dataset.theme = theme;
			requestAnimationFrame(() => {
				document.documentElement.classList.toggle('no-transitions', false);
			});
		}
	}
}