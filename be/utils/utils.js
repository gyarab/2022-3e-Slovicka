const {promisify} = require("util");
const crypto = require("crypto");

function parseId(num) {
	const numParsed = Number(num);

	if (isNaN(numParsed) || !numParsed) {
		throw new Error('Wrong data type');
	}

	return numParsed;
}

/*
 * Get hex encoded string with `bytes` of entropy.
 */
async function random_bytes(bytes) {
	return await promisify(crypto.randomBytes)(bytes);
}

function replaceSpecialLetters(word) {
	const letters = {
		'A': '[AaáÁàâãäåæ]',
		'B': '[Bb]',
		'C': '[CcčČç]',
		'D': '[DdĎď]',
		'E': '[EeéÉěĚèêë]',
		'F': '[Ff]',
		'G': '[Gg]',
		'H': '[Hh]',
		'I': '[IiíÍìîï]',
		'J': '[Jj]',
		'K': '[Kk]',
		'L': '[Ll]',
		'M': '[Mm]',
		'N': '[NnňŇñ]',
		'O': '[OoóÓòôöõø]',
		'P': '[Pp]',
		'Q': '[Qq]',
		'R': '[RrŘř]',
		'S': '[SsŠš]',
		'T': '[TtŤť]',
		'U': '[UuÚúůŮüÜùû]',
		'V': '[Vv]',
		'W': '[Ww]',
		'X': '[Xx]',
		'Y': '[YyýÝÿ]',
		'Z': '[ZzŽž]'
	};

	const charArr = word.split("");

	for (let i = 0; i < charArr.length; i++) {
		for (const [k, v] of Object.entries(letters)) {
			if (v.includes(charArr[i])) {
				charArr[i] = k;
			}
		}
	}

	return charArr.join("").toLowerCase();
}

function formatMillisecondsToTimestamp(ms) {
	const dateObj = new Date(ms);
	const formatTwoDigit = method => {
		return (dateObj[method]() + '').length === 1 ? '0' + dateObj[method]() : dateObj[method]()
	};
	const month = (dateObj.getMonth() + 1 + '').length === 1 ? '0' + (dateObj.getMonth() + 1) : dateObj.getMonth() + 1;
	const date = dateObj.getFullYear() + '-' + month + '-' + formatTwoDigit('getDate');
	const time = formatTwoDigit('getHours') + ':' + formatTwoDigit('getMinutes') + ':' + formatTwoDigit('getSeconds');

	return date + ' ' + time;
}

function formatTimeTwoDigit(n) {
	return n < 10 ? '0' + n : n
}

function formatPostgresTimestamp(date) {
	return date.getFullYear() + '-' + formatTimeTwoDigit(date.getMonth() + 1) + '-' + formatTimeTwoDigit(date.getDate());
}

function arrayToMap(arr, key) {
	const map = new Map();

	for (const a of arr) {
		map.set(a[key], a);
	}

	return map;
}

module.exports = {
	formatMillisecondsToTimestamp,
	replaceSpecialLetters,
	formatPostgresTimestamp,
	formatTimeTwoDigit,
	random_bytes,
	parseId,
	arrayToMap
}