class Router {
	routes = [];

	constructor(commonRouteHandler) {
		this.commonRouteHandler = commonRouteHandler;
	}

	/**
	 *
	 * @param {async Function} r.handler
	 * @param {string} r.route
	 * @param {Function} r.accessible
	 * @param {string} r.group
	 */
	addRoute(r) {
		let captures = [];
		let re = r.path.replace(/\//g, '\\/').replace(/\{([a-z_0-9-]+)(?::([a-z]+))?\}/g, function(m, name, type) {
			captures.push({
				name,
				type: type || 'int'
			});

			if (!type || type == 'int') {
				return '([0-9]+)';
			} else if (type == 'str') {
				return '([A-Za-z0-9-]+)';
			} else if (type == 'rest') {
				return '(.*)';
			} else {
				throw new Error('Invalid endpoint capture type: ' + type);
			}
		});

		re = new RegExp('^' + re + '$');

		let match = function(pathname) {
			re.lastIndex = 0;

			let m = re.exec(pathname);
			if (!m) {
				return false;
			}

			let out = {};

			captures.forEach((c, idx) => {
				let v = m[idx + 1];

				if (c.type == 'int') {
					v = Number(v);
				}

				out[c.name] = v;
			});

			return out;
		};

		this.routes.push({
			...r,
			match,
		});
	}

	addRoutes(list) {
		list.forEach(r => this.addRoute(r));
	}

	async route({path = location.pathname, paramsFn = p => p, resolve = true, mode = 'replace'} = {}) {
		path = path.replace(/\/{2,}/, '/').replace(/\/$/, '') || '/';

		let params = paramsFn(new URLSearchParams(location.search));
		let paramsStr = params.toString();
		let url = new URL(path + (paramsStr ? '?' + paramsStr : ''), location.href);

		if (mode == 'push') {
			history.pushState({}, '', url.toString());
		} else if (mode == 'replace') {
			history.replaceState({}, '', url.toString());
		}

		if (resolve) {
			await this.resolveRoute(url);
		}
	}

	// simple route() helpers
	pushRoute(path) {
		return this.route({
			path,
			paramsFn: () => new URLSearchParams(),
			mode: 'push',
		});
	}

	replaceRoute(path) {
		return this.route({
			path,
			paramsFn: () => new URLSearchParams(),
		});
	}

	async resolveCurrentRoute() {
		await this.resolveRoute(new URL(location.href));
	}

	findRouteForURL(url) {
		let path = url.pathname.replace(/\/{2,}/, '/').replace(/\/$/, '') || '/';

		for (let route of this.routes) {
			let captures = route.match(path);
			if (captures) {
				return {
					path,
					captures,
					params: url.searchParams,
					route,
				};
			}
		}
	}

	async missingRouteHandler(url) {
		APP.show({
			class: PageNotFound
		});
	}

	async resolveRoute(url) {
		let match = this.findRouteForURL(url);
		if (match) {
			this.routePath = match.path;
			this.routeGroup = match.route.group;
			this.routeMatch = match;

			document.documentElement.dataset.routegroup = this.routeGroup || '';

			if (await this.commonRouteHandler(match) && (match.route.accessible && match.route.accessible() || true))
				return;

			await match.route.handler(match);
			return;
		}

		await this.missingRouteHandler(url);
	}

	isRouteGroup(group) {
		return this.routeGroup == group;
	}

	getCurrentRoute() {
		return this.routeMatch && this.routeMatch.route;
	}
}