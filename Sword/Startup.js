class Startup {
	constructor(commonRouteHandler, routes, afterInit) {
		document.addEventListener('DOMContentLoaded', (event) => {
			this.init(commonRouteHandler, routes);
			afterInit();
		})
	}

	init(commonRouteHandler, routes) {
		globalThis.APP = new Application(document.body);
		globalThis.ROUTER = new Router(commonRouteHandler);
		globalThis.NOTIFICATION = new Notifications(document.body);
		globalThis.ERRORS = new Errors();
		globalThis.PopupManager = new PopupManagerObj(document.body);
		globalThis.DataManager = new AppDataManager(document.body);
		globalThis.i18n = new I18n();
		globalThis.Routes = {};

		window.onunhandledrejection = e => {
			if (e.reason instanceof AbortError) {
				return;
			}

			if (e.reason instanceof RESTError) {
				NOTIFICATION.notify({
					kind: 'error',
					text: e.reason.serverError ? e.reason.serverError : 'Chyba serveru' + ': ' + e.reason.message,
					priority: 5,
					timeout: 5000,
				});
			}

			ERRORS.resolveErrorText(e.reason, null, true);
			console.error(e);
		}

		ROUTER.addRoutes(routes);
		ROUTER.resolveCurrentRoute();
	}
}