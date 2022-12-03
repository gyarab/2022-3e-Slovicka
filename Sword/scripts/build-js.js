/**
 * This file is same as build.js.sh, this file should be only used when you cannot use bash scripts.
 */

const UglifyJS = require('uglify-js');
const fs = require('fs');

const SWORD_CORE = [
    'Sword/custom-elements/custom-elements-polyfill.min.js',
    'Sword/custom-elements/customElements.js',
	'Sword/Sword.js',
	'Sword/widgets/form.js',
    'Sword/widgets/complex-widgets.js',
	'Sword/widgets/smarttable.js',
	'Sword/widgets/widgets.js',
	'Sword/widgets/popupmanager.js',
	'Sword/widgets/svg-widgets.js',
	'Sword/utils/REST.js',
	'Sword/utils/Application.js',
	'Sword/utils/Errors.js',
	'Sword/utils/Notifications.js',
	'Sword/utils/Router.js',
	'Sword/utils/utils.js',
	'Sword/utils/Data.js',
	'Sword/utils/i18n/i18next.min.js',
	'Sword/Startup.js',
	'Sword/widgets/Screens.js'
]

const MAIN_PKG=[
	'node_modules/confetti-js/dist/index.min.js',
	'fe/I18n.js',
    'fe/Data.js',
    'fe/Forms.js',
    'fe/MyProfile.js',
    'fe/Administration.js',
    'fe/Courses.js',
    'fe/Adventures.js',
	'fe/main.js',
	'node_modules/socket.io/client-dist/socket.io.js'
]

const files = {};

[...SWORD_CORE, ...MAIN_PKG].forEach(f => {
	files[f] = fs.readFileSync(f, "utf-8");
})

const minified = UglifyJS.minify(files, {
	sourceMap: {
		filename: 'main.build.js.map',
		url: 'main.build.js.map'
	}
});

fs.writeFileSync("gen/fe/main.build.js", minified.code, "utf8");
fs.writeFileSync("gen/fe/main.build.js.map", minified.map, "utf8");