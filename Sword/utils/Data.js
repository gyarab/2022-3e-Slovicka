/**
 * Component which will be extending from this component needs main element to be custom element for triggering
 * functions connect and disconnect. Otherwise will do nothing or you will need to customize it for your use case.
 */
class DataManagerSwordListener extends Sword {
	dataManagerEvents = [];

	getListeners() {
		return [];
	}

	registerListeners() {
		const listeners = this.getListeners();

		for (const l of listeners) {
			this.registerListener(l);
		}
	}

	registerListener(listener) {
		this.dataManagerEvents.push(DataManager.on(listener.name, (obj, data) => listener.handler(data), this));
	}

	connect() {
		this.registerListeners();
	}

	disconnect() {
		for (const e of this.dataManagerEvents) {
			e.remove();
		}
	}
}