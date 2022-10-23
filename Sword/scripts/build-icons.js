const childProcess = require('child_process');

process.env.ICONS_DIR = 'fe/icons';
process.env.ICONS_OUT_JS = 'gen/fe/icon-data.js';
process.env.ICONS_OUT_SVG='gen/fe/icon-symbols.svg';
process.env.ICONS_OUT_SASS='gen/fe/_icon-data.sass';

function runScript(scriptPath, callback) {
	let invoked = false;

	const process = childProcess.fork(scriptPath);

	process.on('error', function (err) {
		if (invoked) return;
		invoked = true;
		callback(err);
	});

	process.on('exit', function (code) {
		if (invoked) return;
		invoked = true;
		const err = code === 0 ? null : new Error('exit code ' + code);
		callback(err);
	});
}

runScript('./Sword/utils/icons/generate.js', function (err) {
	if (err) throw err;
	console.log('Building icons finished');
});