/**
 * Use these custom element tags as main element of the component if you want to use connected and disconnected callbacks.
 *
 * @type {{DIV: string, FORM: string, UL: string}}
 */
const CUSTOM_ELEMENT = {
	DIV: 'x-sword-div',
	UL: 'x-sword-ul',
	FORM: 'x-sword-form'
}

if (!customElements.get(CUSTOM_ELEMENT.DIV)) {
	customElements.define(CUSTOM_ELEMENT.DIV, class extends HTMLDivElement {
		callstack = 0;
		isSwordCustomElement = true;

		connectedCallback() {
			if (this.callstack === 0) {
				this.callstack++;

				this.connectedCallback()
			}
		}

		disconnectedCallback() {
			if (this.callstack === 1) {
				this.callstack--;
				this.disconnectedCallback();
			}
		}
	}, {extends: 'div'});
}

if (!customElements.get(CUSTOM_ELEMENT.FORM)) {
	customElements.define(CUSTOM_ELEMENT.FORM, class extends HTMLFormElement {
		callstack = 0;
		isSwordCustomElement = true;

		connectedCallback() {
			if (this.callstack === 0) {
				this.callstack++;

				this.connectedCallback()
			}
		}

		disconnectedCallback() {
			if (this.callstack === 1) {
				this.callstack--;
				this.disconnectedCallback();
			}
		}
	}, {extends: 'form'});
}

if (!customElements.get(CUSTOM_ELEMENT.UL)) {
	customElements.define(CUSTOM_ELEMENT.UL, class extends HTMLUListElement {
		callstack = 0;
		isSwordCustomElement = true;

		connectedCallback() {
			if (this.callstack === 0) {
				this.callstack++;

				this.connectedCallback()
			}
		}

		disconnectedCallback() {
			if (this.callstack === 1) {
				this.callstack--;
				this.disconnectedCallback();
			}
		}
	}, {extends: 'ul'});
}