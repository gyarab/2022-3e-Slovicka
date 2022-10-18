const DateUtils = {
	isToday: date => {
		const actual = new Date();
		return date.getDate() === actual.getDate() &&
			date.getMonth() === actual.getMonth() &&
			date.getFullYear() === actual.getFullYear();
	},

	daysDifference: (date1, date2) => {
		date1.setHours(0,0,0,0);
		date2.setHours(0,0,0,0);
		const diffTime = Math.abs(date2 - date1);
		return diffTime / (1000 * 60 * 60 * 24);
	},

	getMonthName: (date, lang = "cz") => {
		const months = lang === "en" ?
			["January", "February", "March", "April", "May", "June", "July", "August", "September",
				"October", "November", "December"] :
			["Leden", 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září',
				'Říjen', 'Listopad', 'Prosinec'];
		return months[date.getMonth()];
	},

	getDayName: (date, lang = "en") => {
		const days = lang === "en" ?
			['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] :
			['Neděle', 'Podělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
		return days[date.getDay()];
	},

	getDayNameFromShortened: (dayShort, lang = "en") => {
		return {
			'sun': lang === 'en' ? 'Sunday' : 'Neděle',
			'mon': lang === 'en' ? 'Monday' : 'Pondělí',
			'tue': lang === 'en' ? 'Tuesday' : 'Úterý',
			'wen': lang === 'en' ? 'Wednesday' : 'Středa',
			'thu': lang === 'en' ? 'Thursday' : 'Čtvrtek',
			'fri': lang === 'en' ? 'Friday' : 'Pátek',
			'sat': lang === 'en' ? 'Saturday' : 'Sobota'
		}[dayShort.toLowerCase()];
	},

	formatDate(format, date) {
		format = format.replace('yyyy', date.getFullYear());
		format = format.replace('dd', date.getDate());
		format = format.replace('mm', date.getMonth() + 1);
		format = format.replace('ww', this.getDayName(date));
		format = format.replace('mmn', this.getMonthName(date));
		format = format.replace('hh', this.getMonthName(date));
		format = format.replace('mm', this.getMonthName(date));
		format = format.replace('ss', this.getMonthName(date));
		return format;
	},

	parseDateIso(date, utc) {
		if (date instanceof Date) {
			return date;
		}

		if (typeof date == 'number') {
			return new Date(1000 * date);
		}

		if (typeof date != 'string') {
			return null;
		}

		var m = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:(?:\s+|T)(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?(Z)?/), i;
		if (m) {
			for (i = 1; i <= 6; i++) {
				m[i] = m[i] ? Number(m[i]) : 0;
			}

			if (utc == null) {
				if (m[7] == 'Z') {
					utc = true;
				} else {
					utc = false;
				}
			}

			let d = new Date;
			if (utc) {
				d.setUTCHours(m[4], m[5], m[6], 0);
				d.setUTCFullYear(m[1], m[2] - 1, m[3]);
			} else {
				d.setHours(m[4], m[5], m[6], 0);
				d.setFullYear(m[1], m[2] - 1, m[3]);
			}

			return d;
		}

		return null;
	},

	formatDateIso(d, time = false) {
		d = DateUtils.parseDateIso(d);
		if (!d) {
			return d;
		}

		function p(n, len = 2) {
			return String(n).padStart(len, '0');
		}

		return p(d.getFullYear(), 4) + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
			(time ? ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) : '');
	},

	formatUTCDateIso(d, time = false) {
		d = DateUtils.parseDateIso(d);
		if (!d) {
			return d;
		}

		function p(n, len = 2) {
			return String(n).padStart(len, '0');
		}

		return p(d.getUTCFullYear(), 4) + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
			(time ? ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + 'Z' : '');
	},

	getElapsedTime(start) {
		let interval = Math.floor((new Date() - Utils.parseDateIso(start)) / 1000);
		let m = Math.floor(interval / 60);
		let s = interval % 60;

		return String(m).padStart(1, '0') + ':' + String(s).padStart(2, '0');
	},

	secondsToHoursMinutes(seconds) {
		const date = new Date(null);
		date.setSeconds(seconds);
		return date.toISOString().substr(11, 8);
	},
}

const BrowserUtils = {
	getSearchParam: (name) => {
		const urlParams = new URLSearchParams(document.location.search.substring(1));
		return urlParams.get(name);
	},

	isOpera() {
		return (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	},

	isFirefox() {
		return navigator.userAgent.toLowerCase().includes('firefox');
	},

	isSafari() {
		return /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
	},

	isIE() {
		return /*@cc_on!@*/!!document.documentMode;
	},

	isEdge() {
		return window.navigator.userAgent.indexOf("Edge/") > -1;
	},

	isChrome() {
		return !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
	},

	isEdgeChromium() {
		return BrowserUtils.isChrome() && (navigator.userAgent.indexOf("Edg") != -1);
	},

	resolveBrowser() {
		const opera = this.isOpera();

		if (opera) {
			return 'opera';
		}

		const firefox = this.isFirefox();

		if (firefox) {
			return 'firefox';
		}

		const safari = this.isSafari();

		if (safari) {
			return 'safari';
		}

		const IE = this.isIE();

		if (IE) {
			return 'IE'
		}

		const edge = this.isEdge();

		if (edge) {
			return 'edge';
		}

		const chrome = this.isChrome();

		if (chrome) {
			return 'chrome';
		}

		const edgeChromium = this.isEdgeChromium();

		if (edgeChromium) {
			return 'edge-chromium';
		}

		return 'unknown';
	}
}

/**
 * @singleton
 * Helper functions for working with text.
 */
const TextUtils = {
	// map unaccented uppercase letter to all accented versions
	accentMap: {
		'A': '[AaáÁ]',
		'B': '[Bb]',
		'C': '[CcčČ]',
		'D': '[DdĎď]',
		'E': '[EeéÉěĚ]',
		'F': '[Ff]',
		'G': '[Gg]',
		'H': '[Hh]',
		'I': '[IiíÍ]',
		'J': '[Jj]',
		'K': '[Kk]',
		'L': '[Ll]',
		'M': '[Mm]',
		'N': '[NnňŇ]',
		'O': '[OoóÓ]',
		'P': '[Pp]',
		'Q': '[Qq]',
		'R': '[RrŘř]',
		'S': '[SsŠš]',
		'T': '[TtŤť]',
		'U': '[UuÚúůŮ]',
		'V': '[Vv]',
		'W': '[Ww]',
		'X': '[Xx]',
		'Y': '[YyýÝ]',
		'Z': '[ZzŽž]'
	},

	/**
	 * @method
	 * Transliterate czech characters into their non-accented versions.
	 * @param {String} v Input value.
	 * @return {String} Transliterated string.
	 */
	unaccent: (function() {
		var from = "áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ".split("");
		var   to = "acdeeinorstuuyzACDEEINORSTUUYZ".split("");
		var  map = {}, i;

		for (i = 0; i < from.length; i++) {
			map[from[i]] = to[i];
		}

		var re = new RegExp(from.join("|"), "g");

		return function(v) {
			return String(v).replace(re, function(c) {
				return map[c];
			});
		};
	})(),

	/**
	 * Escape string for safe use within regular expression.
	 * @param {String} str String to be escaped.
	 * @return {String} Escaped string.
	 *
	 * Specials: \ ^ $ * + ? . ( ) | { } [ ]
	 * More: / -
	 */
	escapeRegexp: function(str) {
		return String(str).replace(/[|()\[\]{}.+*?^$\\\/-]/g, "\\$&");
	},

	/**
	 * Create regular expression that will loosely match accented text even
	 * if `str` is not accented.
	 * @param {String} str String to match.
	 * @return {RegExp} Regular expression object.
	 */
	unaccentedRegexp: function(str) {
		return TextUtils.escapeRegexp(TextUtils.unaccent(str)).replace(/\S/g, function(chr) {
			return TextUtils.accentMap[chr.toUpperCase()] || chr;
		});
	},

	/**
	 * Split query string into words and create array of regex fragments
	 * that match each word in the query regardless of case or accent.
	 * @param {String} query Query string.
	 * @return {String[]} regex fragments.
	 */
	splitQuery: function(query) {
		return String(query).split(/\s+/u).filter(v => v).sort(function(a, b) {
			return b.length - a.length;
		}).map(TextUtils.unaccentedRegexp);
	},

	/**
	 * Create function that will tokenize `query` string and return true if
	 * __any__ of the tokens match string passed to the function.
	 * @param {String} query Query string.
	 * @return {Function} Matcher function.
	 * @return {String} return.str String to test for the match.
	 */
	createMatchAny: function(query) {
		const words = TextUtils.splitQuery(query);
		if (words.length == 0) {
			return function() {
				return true;
			};
		}

		const regexp = new RegExp('(^|\\s)(' + words.join("|") + ')', 'g');
		return function(v) {
			return String(v).match(regexp);
		};
	},

	/**
	 * Create function that will tokenize `query` string and return true if
	 * __all__ of the tokens match string passed to the function.
	 * @param {String} query Query string.
	 * @return {function(*=): this is RegExp[]} Matcher function.
	 * @return {String} return.str String to test for the match.
	 */
	createMatchAll: function(query) {
		const words = TextUtils.splitQuery(query);
		if (words.length === 0) {
			return function() {
				return true;
			};
		}

		const regexps = words.map(function(word) {
			return new RegExp('(^|\\s)(' + word + ')', 'g');
		});

		return function(v) {
			v = String(v);

			return regexps.every(function(r) {
				return v.match(r);
			});
		};
	},
};

const Utils = {
	parseNum(num) {
		const numParsed = Number(num);

		if (isNaN(numParsed) || !numParsed) {
			throw new Error('Provided value is not number');
		}

		return numParsed;
	},

	isBool(prop) {
		return typeof prop === 'boolean';
	},

	isArray(prop) {
		return Array.isArray(prop);
	},

	isNum(prop) {
		return typeof prop === 'number';
	},

	isString(prop) {
		return typeof prop === 'string';
	},

	isSymbol(prop) {
		return typeof prop === 'symbol';
	},

	notDefined(prop) {
		return prop == null;
	},

	isNull(prop) {
		return prop === null;
	},

	isNotNull(prop) {
		return prop !== null;
	},

	isUndefined(prop) {
		return prop === undefined;
	},

	isObject(prop) {
		return typeof prop === 'object';
	},

	arrayToMap: (arr, key) => {
		const map = new Map();

		for (const a of arr) {
			map.set(a[key], a);
		}

		return map;
	},

	random(max) {
		return Math.floor(Math.random() * max);
	},

	calculatePercentage(numerator, denominator) {
		return Math.floor(100 * numerator / denominator) || 0;
	},

	convertArrayToOptions(arr, valueKey, textKey) {
		const options = [];

		for (const u of arr) {
			options.push({
				value: u[valueKey],
				text: u[textKey]
			})
		}

		return options
	},

	async copyToClipboard(text) {
		await navigator.clipboard.writeText(text);
	},

	getLocalStorageItem(key, defaultValue) {
		const item = localStorage.getItem(key);
		return item != null ? JSON.parse(item) : defaultValue;
	},

	filterRows(search, rows, columns, orderColumn) {
		let match = TextUtils.createMatchAll(search || '');

		const recordsFiltered = rows.filter(r => match(columns.map(f => r[f]).join(' ')))
		recordsFiltered.sort((a, b) => a[orderColumn] === b[orderColumn] ? 0 : (a[orderColumn] > b[orderColumn] ? 1 : -1));

		return recordsFiltered;
	}
}

let Uploads = {
	uploadFile(path, file, {signal, progress, headers} = {}) {
		return new Promise((res, rej) => {
			let xhr = new XMLHttpRequest();
			const formData = new FormData();

			if (Array.isArray(file) || file instanceof FileList) {
				for (const f of file) {
					formData.append('file', f);
				}
			} else {
				formData.append('file', file);
			}

			if (signal instanceof AbortSignal) {
				signal.onabort = () => {
					rej(new AbortError);
					xhr.abort();
				};
			}

			xhr.open('POST', path, true);
			xhr.timeout = 60 * 60 * 1000; // 1 hour
			xhr.responseType = 'json';
			xhr.setRequestHeader('X-Anti-CSRF', '1');
			for (let [k, v] of Object.entries(headers || {})) {
				xhr.setRequestHeader(k, v);
			}

			xhr.onabort = ev => {
				rej(new AbortError);
			};

			xhr.ontimeout = ev => {
				rej(new Error(_('Nahrání selhalo - vypršel časový limit')))
			};

			xhr.onerror = ev => {
				rej(new Error(_('Nahrání selhalo - neznámá chyba')))
			};

			xhr.upload.onprogress = ev => {
				if (ev.lengthComputable) {
					progress && progress(ev);
				}
			};

			xhr.onload = ev => {
				if (xhr.status >= 200 && xhr.status < 300) {
					res(xhr.response);
				} else {
					let err = new Error(xhr.response ? xhr.response.error : _('Neznámá chyba'));
					err.xhr = xhr;
					err.code = xhr.response.code;
					err.detail = xhr.response.detail;
					rej(err);
				}
			};

			xhr.send(formData);
		});
	},
};

Object.assign(Array.prototype, {
	isEmpty() {
		return this.length === 0;
	},

	isAtLeastLong(length) {
		return this.length >= length;
	},

	isShorter(length) {
		return this.length < length;
	},

	updateByIndex(item, fn) {
		const idx = this.findIndex(fn);

		this[idx] = item;
	},

	deleteByIndex(fn) {
		const idx = this.findIndex(fn);

		this.splice(idx, 1);
	}
})