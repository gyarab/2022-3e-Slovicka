const {exec} = require('child_process');
const fs = require('fs');

try {
	fs.rmSync('gen', { recursive: true, force: true });
} catch (ignored) {}

fs.mkdirSync('gen');
fs.mkdirSync('gen/fe');

exec('npm run win-build-styles & npm run win-build-js & npm run win-build-icons', (err, stdout, stderr) => {
	if (err) {
		console.log(err);
	}

	console.log('Build successful');
})