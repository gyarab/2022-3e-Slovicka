/** Sword.js is an framework for easier webapp development.
 * Sword.js is written in ES9 javascript standards.
 *
 * Sword - Works with DOM and every class with DOM extends from it {@link Sword}
 *
 * Created by Oren Holiš 2021
 */

class SwordExternalEvents {
	constructor() {
		this.externalListeners = [];
	}

	generateUniqueListenerId() {
		const listenersSorted = this.externalListeners.sort((a, b) => a.id - b.id);
		const lastListener = listenersSorted[listenersSorted.length - 1];
		return lastListener ? lastListener.id + 1 : 0;
	}

	addExternalListener(event, el, fn, options = null) {
		const id = this.generateUniqueListenerId();

		this.externalListeners.push({
			event,
			el,
			fn,
			options,
			id
		});

		el.addEventListener(event, fn, options);

		return id;
	}

	removeExternalListener(listener) {
		listener.el.removeEventListener(listener.event, listener.fn, listener.options);
	}

	unbindExternalListeners() {
		for (const listener of this.externalListeners) {
			this.removeExternalListener(listener);
		}
	}

	removeExternalListenerWithId(id) {
		for (const listener of this.externalListeners) {
			if (listener.id === id) {
				this.removeExternalListener(listener);
				return;
			}
		}

		throw new Error(`Listener not found. Id: ${id}`)
	}
}

class DocumentKeyControllerCl extends SwordExternalEvents {
	constructor() {
		super();

		document.addEventListener('keydown', e => {
			const key = (e.ctrlKey ? 'Ctrl_' : '') + (e.altKey ? 'Alt_' : '') + (e.shiftKey ? 'Shift_' : '') + e.key;

			const length = this.externalListeners.length
			const originalListeners = [...this.externalListeners];
			for (let i = 0; i < length; i++) {
				const k = originalListeners[i];

				if (k.key === key) {
					k.fn(e);
				}
			}
 		});
	}

	addExternalListener(key, fn) {
		const id = this.generateUniqueListenerId();

		this.externalListeners.push({
			key,
			fn,
			id
		});

		return id;
	}

	removeExternalListener(listener) {}

	/**
	 * @private
	 */
	unbindExternalListeners() {}

	removeExternalListenerWithId(id) {
		for (let i = 0; i < this.externalListeners.length; i++) {
			const listener = this.externalListeners[i];
			if (listener.id === id) {
				this.externalListeners.splice(i, 1);
				return;
			}
		}
	}
}

const DocumentKeyController = new DocumentKeyControllerCl();

const CREATE_ELEMENT_ATTRIBUTES_MAPPING = {
	textContent: 'assign',
	disabled: 'assign',
	className: 'assign',
	children: 'skip',
	nodeName: 'skip',
	ref: 'skip',
	render: 'skip'
}

/**
 * Main component for work with DOM.
 * You must extend from it and write into your function beforeRender/render.
 *
 * In render must be created this.el with this.createElement();
 * BeforeRender is used typically with widgets you extend from widget where is render.
 *
 * @example Simple class
 * 		class HelloWorld extends Sword {
 * 		 	render() {
 * 		 	  this.el = this.createElement({
 * 		 	  	textContent: 'Hello World'
 * 		 	  });
 * 		 	}
 * 		}
 *
 * @example Using widgets
 * 		class WidgetButton extends Sword {
 * 			text;
 * 			className;
 *
 * 		    render() {
 * 		        this.el = this.createElement({
 * 		            nodeName: 'div',
 * 		            className: 'button' + this.className,
 * 		            textContent: this.text
 * 		        });
 * 		    }
 * 		}
 *
 * 		class ButtonHelloWorld extends WidgetButton {
 * 		    beforeRender() {
 * 		        this.text = 'Hello World';
 * 		        this.className = 'hello-world';
 * 		    }
 * 		}
 *
 * @example References and class rendering
 * 		class HelloWorldButton extends Sword {
 * 			render() {
 * 			 	this.el = this.createElement({
 * 			 		nodeName: 'button',
 * 			 		textContent: 'Say hello world'
 * 			 	});
 * 			}
 *
 * 			sayHelloWorld() {
 * 			 	alert('Hello World!!!');
 * 			}
 * 		}
 *
 * 		class HelloWorld extends Sword {
 * 			render() {
 * 			 	this.el = this.createElement({
 * 			 	   children: [{
 * 			 	       textContent: 'Hello World',
 * 			 	   },{
 * 			 	       class: HelloWorldButton,
 * 			 	       ref: 'helloWorldButton',
 * 			 	       'on:click': () => this.helloWorldButton.sayHelloWorld()
 * 			 	   }]
 * 			 	});
 * 			}
 * 		}
 *
 * @example Events
 * 		class Cow extends Sword {
 * 			render() {
 * 			 	this.el = this.createElement({
 * 			 	    'on:click': () => this.event('buuBuu')
 * 			 	});
 * 			}
 * 		}
 *
 * 		class Dog extends Sword {
 * 			render() {
 * 			 	this.el = this.createElement({
 * 			 	 	'on:click: () => this.event('hafHaf')
 * 			 	});
 * 			}
 * 		}
 *
 * 		class Animal extends Sword {
 * 			render() {
 * 			 	this.el = this.createElement({
 * 			 	    children: [{
 * 			 	        class: Cow,
 * 			 	        'on:buuBuu': () => alert('You have clicked cow')
 * 			 	    },{
 * 			 	        class: Dog,
 * 			 	        'on:hafHaf': () => alert('You have clicked dog')
 * 			 	    }]
 * 			 	});
 * 			}
 * 		}
 *
 *
 */
class Sword extends SwordExternalEvents {
	/**
	 * Main rendered element in component.
	 * @type {HTMLElement}
	 */
	el;

	/**
	 * Every rendered child is saved into array for easier access.
	 * @type {array}
	 */
	children = [];

	/**
	 * Parent component of component.
	 * @type {Object}
	 */
	parentComponent = null;

	/**
	 * All events registered on class
	 * @type {object}
	 */
	events = {};

	bindedDocumentKeys = [];

	#topTierComponent = false;

	/**
	 * Initialization of component.
	 *
	 * If in class which extends Sword is not specified constructor this constructor will be triggered.
	 * No one with high knowledge of working Sword.js is not recommended to change constructor.
	 *
	 * Constructor sets on class properties and render class.
	 *
	 * @param {HTMLElement} parent - place where component will be rendered
	 * @param {object} properties  - any variables needed to pass to component in this
	 * @param {object} parentComponent - parent class of class
	 *
	 * @throws Error if this.render and this.beforeRender are missing
	 * @throws Error If this.el is missing
	 * @throws Error If this.el is different type from HTMLElement|Object
	 * @throws Error If parent is not specified
	 */
	constructor(parent, properties, parentComponent) {
		super();

		if (!parentComponent) {
			this.#topTierComponent = true;
		}

		this.parentComponent = parentComponent || parent;
		this.applyClassConfig(properties);

		if (Sword.prototype.beforeRender !== this.beforeRender) {
			this.beforeRender();
		}

		if (Sword.prototype.render === this.render) {
			throw new Error(
				'In ' + new.target.name + ' is not defined this.render or this.beforeRender'
			);
		}

		this.render();

		if (!this.el) {
			throw new Error(
				'Main element is not specified. ' +
				'Try to check you have in your function this.render() this.#content' +
				'Error occurred in ' + new.target.name + ' render.'
			);
		} else if (typeof this.el !== 'object') {
			throw new Error(
				'Main element is not object in class ' + new.target.name
			);
		}

		if (!parent) {
			throw new Error(
				'Parent is not specified in class ' + new.target.name + '.' +
				'It is often caused in the SW.start creating new starting class is not defined parent.'
			);
		}

		this.#initElement(parent, new.target.name);
	}

	#initElement(parent, name) {
		if (customElements.get(this.el.getAttribute('is'))) {
			this.el.connectedCallback = () => this.el.isConnected && this.connect();
			this.el.disconnectedCallback = () => !this.el.isConnected && this.disconnect() && this.destroy();
			this.className && this.el.classList.add(...this.className.split(" "));
		} else if (Sword.prototype.connect !== this.connect) {
			console.warn(`Function connect is defined, but main element is not custom element. Component name ${name}`);
		}

		this.el.setAttribute('sword-comp', name);
		this.el.classList.add(this.#convertCamelCaseToSnakeCase(name))
		parent.appendChild(this.el);
	}

	#convertCamelCaseToSnakeCase(text) {
		return text.replace(/[A-Z]/g, (letter, i) => `${i === 0 ? '' : '-'}${letter.toLowerCase()}`);
	}

	connect() {}
	disconnect() {}

	/**
	 * This is function is automatically started in constructor and starts class.
	 * In this function must be declared this.#content.
	 *
	 * @Override
	 */
	render() {}

	/**
	 * If this function is specified it is ran before render.
	 * Often used for defining properties for widgets.
	 *
	 * @Override
	 */
	beforeRender() {}

	/**
	 * Applies config on class.
	 *
	 * @param {object} conf - Initial configuration of class with listeners
	 */
	applyClassConfig(conf) {
		if (conf) {
			const entries = Object.entries(conf);
			for (let i = entries.length - 1; i >= 0; i--) {
				const [key, value] = entries[i];

				if (key === 'class' || key === 'ref') {
					continue;
				}

				if (/^on\*?:/.exec(key) !== null) {
					this.on(key.slice(3), value, this, (/^on\*?:/).exec(key) !== null);
					continue;
				}

				this[key] = value;
			}
		}
	}

	beforeDestroy() {
		return true;
	}

	/**
	 * Completely destroys component from her parent and all of her data.
	 */
	destroy() {
		const destroy = this.beforeDestroy()

		if (!destroy) {
			return;
		}

		this.fire('destroy');

		if (!this.#topTierComponent) {
			this.parentComponent.removeChild(this);
		} else {
			this.el.remove();
		}

		for (let i = this.bindedDocumentKeys.length - 1; i >= 0; i--) {
			const id = this.bindedDocumentKeys[i];
			DocumentKeyController.removeExternalListenerWithId(id);
		}

		this.unbindExternalListeners();
	}

	/**
	 * Creates element with assigned configuration.
	 * Empty configuration creates div.
	 *
	 * @example
	 *      this.createElement({
	 *         textContent: 'Hello world!!',
	 *         className: 'hello-world',
	 *         children: [{
	 *             nodeName: 'p',
	 *             textContent: 'This is example of this.createElement',
	 *             'on:click': () => alert('Hello World'),
	 *             ref: 'example'
	 *         },{
	 *             class: HelloWorld
	 *             data: 'Welcome user'
	 *         }]
	 *      });
	 *
	 * Configuration for any element except of classes
	 *
	 * @param {object} conf             - configuration of element
	 * @param {string} conf.nodeName    - Node name of element (if nodeName is empty default is div)
	 * @param {[{}]} conf.children      - Children elements with configuration (They are array of objects)
	 * @param {function} conf.'on:...'  - Adding addEventListener on element name of listener is specified after 'on:'
	 * @param {string} conf.className   - Sets className on element
	 * @param {boolean} conf.invisible  - If it is true sets element invisible
	 * @param {string} conf.ref         - Sets reference on element so you can directly point on it with this
	 * @param {boolean} conf.render     - Determines if element will be rendered
	 * @param {string} conf.*           - Any other configuration properties will be passed as attribute
	 *
	 * Configuration for classes.
	 * In example you can see passing variable text to class HelloWorld.
	 *
	 * @example
	 *      class HelloWorld extends S {
	 *          render() {
	 *              this.#content = this.createElement({
	 *                  textContent: 'Hello ' + this.text
	 *              });
	 *          },
	 *
	 *          deleteText() {
	 *              this.#content.textContent = '';
	 *          }
	 *      }
	 *
	 *      class Initialization extends S {
	 *          render() {
	 *              this.#content = this.createElement({
	 *                  textContent: 'Showing demo',
	 *                  children: [{
	 *                      class: HelloWorld,
	 *                      text: 'World',
	 *                      ref: 'helloWorld'
	 *                  }]
	 *              })
	 *
	 *              // using reference from render to access function on HelloWorld class
	 *              this.helloWorld.deleteText();
	 *          }
	 *      }
	 *
	 * @param {function} conf.class     - Name of rendered class
	 *        {class} conf.ref       	- Name of reference on class
	 *        {function} conf.'on:...'  - Registers event on class (name of listener is specified after 'on:')
	 *        {string} conf.is          - Specifies from which webcomponent will element inherit properties
	 *        {*} conf.*         		- Name of any property you need to pass to class (Note it must be in same children as conf.class)
	 *
	 * @param {object} refs - object where you want to store references (often it is this)
	 * @returns {HTMLDivElement|Sword|SVGElement|Text} Rendered element
	 */
	createElement(conf, refs= null) {
		if (!conf || conf.render === false) {
			return;
		}

		if (conf instanceof Element || conf instanceof HTMLDocument) {
			return conf;
		}

		if (typeof conf === 'string') {
			if (conf.startsWith('icon:')) {
				return this.useIcon(conf.replace('icon:', ''));
			}

			return document.createTextNode(conf);
		}

		const el = document.createElement(conf.nodeName || 'div', conf.is ? {is: conf.is} : null);
		const entries = Object.entries(conf);

		for (let i = entries.length - 1; i >= 0; i--) {
			const [key, value] = entries[i];

			if (CREATE_ELEMENT_ATTRIBUTES_MAPPING[key] === 'skip' || value === undefined) {
				continue;
			}

			if (key === 'class') {
				if (typeof value === 'string') {
					throw new Error('Provided value is not class, probably you have mismatched nodeName and class');
				}

				delete conf.render;
				const newClass = new value(el, conf, this);
				Object.assign(newClass, conf);

				if (conf.ref && refs) {
					refs[conf.ref] = newClass;
				}

				return newClass;
			}

			if (CREATE_ELEMENT_ATTRIBUTES_MAPPING[key] === 'assign') {
				el[key] = value;
				continue;
			}

			if (/^on\*?:/g.test(key)) {
				el.addEventListener(key.replace(/^on\*?:/g, ''), value, /^on\*:/.test(key));
				continue;
			}

			if (key.startsWith('key_')) {
				this.bindedDocumentKeys.push(DocumentKeyController.addExternalListener(
					key.replace('key_', ''),
					value
				));
				continue;
			}

			if (key.startsWith('data_')) {
				el.dataset[key.replace('data_', '')] = value;
				continue;
			}

			if (key === 'invisible' && value === true) {
				el.style.display = 'none';
				continue;
			}

			el.setAttribute(key, value);
		}

		if (conf.ref && refs) {
			refs[conf.ref] = el;
		}

		if (conf.children) {
			const children = conf.children, len = children.length;
			for (let i = 0; i < len; i++) {
				this.append(children[i], refs, el);
			}
		}

		return el;
	}

	/**
	 * Listen to events produced by this object.
	 *
	 * @param {String} name - Name of the event.
	 * @param {Function} fn - Event handler function.
	 * @param {Object} scope - Scope for the event handler
	 * @param {Boolean} captureBubbles - Listen for events on all child
	 * components in addition to this object's events.
	 * @return {Object} Event control object
	 */
	on(name, fn, scope, captureBubbles) {
		const l = {
			id: Object.keys(this.events[name] || {}).length,
			name: name,
			fn: fn,
			scope: scope,
			remove: () => {
				delete this.events[l.name][l.id];
				delete this.id;
			},
			captureBubbles: captureBubbles,
			fire: args => fn.apply(scope || this, args)
		};

		this.events[name] = this.events[name] || {};
		this.events[name][l.id] = l;

		return l;
	}

	/**
	 * Fire event.
	 *
	 * @param {String} name - Event name
	 * @param {*} args - Event arguments
	 */
	fire(name, ...args) {
		args.unshift(this);

		let target = this;
		while (target) {
			const listeners = target.events && target.events[name];
			if (listeners) {
				for (const val of Object.values(listeners)) {
					if (val.captureBubbles || target === this) {
						val.fire(args);
					}
				}
			}

			target = target.parentComponent;
		}
	}

	/**
	 * Renders child into your classes DOM.
	 *
	 * @param {object} childConf - same configuration as this.#content as for {@link Sword#createElement}
	 * @param {object} refs - object where will be stored references
	 * @param {HTMLElement} parent - parent of childConf (default values is this.#content)
	 * @param childAsComponent
	 */
	append(childConf, refs= null, parent= this.el, childAsComponent = false) {
		const newChild = this.createElement(childConf, refs);
		const el = newChild?.el ? newChild.el : newChild;

		if (newChild) {
			this.children.push(newChild);
			parent.appendChild(el);
		}

		if (this.isSword(newChild)) {
			return childAsComponent ? newChild : el;
		} else {
			return el
		}
	}

	/**
	 * Renders child into your classes DOM.
	 *
	 * @param {object} childConf - same configuration as this.el as for {@link Sword#createElement}
	 * @param elToReplace
	 * @param {object} refs - object where will be stored references
	 */
	replaceChild(childConf, elToReplace, refs= null) {
		elToReplace = this.getElement(elToReplace);

		const newChild = this.createElement(childConf, refs);
		const idx = this.children.findIndex(ch => this.getElement(ch) === elToReplace);
		this.children[idx] = newChild;

		elToReplace.parentNode.replaceChild(this.getElement(newChild), elToReplace);

		return newChild;
	}

	replaceChildren(children, refs, parent=this.el) {
		parent.innerHTML = '';

		const len = children.length;
		for (let i = 0; i < len; i++) {
			this.append(children[i], refs, parent);
		}
	}

	/**
	 * Deletes child or child with reference.
	 *
	 * @param {string|HTMLElement|object} child - child or child's reference
	 */
	removeChild(child) {
		const el = this.getElement(child);

		if (typeof(child) === 'string') {
			delete this[child];
		}

		el?.remove();

		this.children.splice(this.children.indexOf(child), 1);
	}

	/**
	 * Changes elements visibility.
	 *
	 * @param {HTMLElement|string|object} el - Element on which will be changed visibility
	 * @param {boolean|null} visible - Condition if element will be visible (not necessary,
	 * 		if visibility is not assigned its calculated on elements visibility)
	 */
	setVisible(el, visible) {
		el = this.getElement(el);
		el.classList.toggle('hidden', !visible);
	}

	/**
	 * Makes element visible with reference or el.
	 * Every other children will be hidden.
	 *
	 * @param {string|HTMLElement|object} child - Reference on element or element directly
	 */
	setVisibleWithReference(child) {
		const el = this.getElement(child);
		for (let i = this.children.length - 1; i >= 0; i--) {
			const child = this.children[i];
			this.setVisible(child, el === child);
		}
	}

	/**
	 * Gets an element from class element.
	 *
	 * @param {string|HTMLElement|object} child - element or element's reference
	 * @returns {HTMLElement|null} Element
	 */
	getElement(child) {
		if (child?.el) {
			return child.el;
		}
		return typeof(child) === 'string' ? this.getElementWithReference(child) : child;
	}

	/**
	 * Get element with reference.
	 *
	 * @param {string|object} ref - Reference
	 * @returns {HTMLElement} Element from reference
	 */
	getElementWithReference(ref) {
		if (ref?.el) {
			return ref.el;
		} else if (this[ref].el) {
			return this[ref].el;
		} else {
			return this[ref];
		}
	}

	traverseComponentChildren(fn) {
		for (let i = this.children.length - 1; i >= 0; i--) {
			const ch = this.children[i];
			if (this.isSword(ch)) {
				fn(ch);
			}
		}
	}

	useIcon(name, config) {
		if (!name) {
			return null;
		}

		let svgNs = 'http://www.w3.org/2000/svg';
		let svg = document.createElementNS(svgNs, 'svg');
		let use = svg.appendChild(document.createElementNS(svgNs, 'use'));
		let vb = ICON_SIZES[name];
		let c = config || {};

		svg.classList.add('icon');
		svg.dataset.name = name;

		if (vb) {
			svg.setAttribute('viewBox', vb[0]);
			svg.setAttribute('width', vb[1] + 'px');
			svg.setAttribute('height', vb[2] + 'px');
			svg.style = '--width:' + vb[1] + 'px;--height:' + vb[2] + 'px';
		}

		if (c.cls) {
			svg.classList.add(c.cls);
		}

		use.setAttribute('href', '#icon-' + name);

		return svg;
	}

	animate(el, config) {
		return new Promise((resolve, reject) => {
			const duration = config.duration || 0.4,
				change = {},
				names = [];

			for (let [k, v] of Object.entries(config)) {
				if (k != 'duration' && k != 'timing') {
					change[k] = v;
					names.push(k);
				}
			}

			let finish = () => {
				el.style.transition = '';
				el.removeEventListener('transitionend', finish);
				resolve();
			};

			el.addEventListener('transitionend', finish);

			Object.assign(el.style, {
				'transition-property': names.join(', '),
				'transition-duration': duration + 's',
				'transition-timing-function': config.timing || 'ease'
			});

			el.offsetHeight;

			Object.assign(el.style, change);
		});
	}

	isSword(obj) {
		return obj instanceof Sword;
	}
}

class SVGSword extends Sword {
	/**
	 * Main rendered element in component.
	 * @type {SVGElement}
	 */
	el;

	/**
	 * @returns {HTMLElement|SVGElement}
	 */
	createElement(config, refs) {
		const svgEl = document.createElementNS('http://www.w3.org/2000/svg', config.nodeName);

		for (let key in config) {
			if (key === 'children' || key === 'nodeName' || key === 'ref') {
				continue;
			}

			svgEl.setAttribute(key, config[key]);
		}

		if (config.ref && refs) {
			refs[config.ref] = svgEl;
		}

		if (config.children) {
			config.children.forEach((child) => {
				this.append(child, refs, svgEl);
			});
		}

		return svgEl;
	}
}

// TODO
class SwordAsync extends Sword {}