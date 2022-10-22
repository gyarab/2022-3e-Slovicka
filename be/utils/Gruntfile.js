const env = require('../env.js');

module.exports = (grunt) => {
	const watchers = {
		options: {
			spawn: false,
		},
		watch_sass: {
			files: ['../../fe/styles/*.sass', '../../fe/styles/*.scss'],
			tasks: ['shell:styles']
		},
		watch_icons: {
			files: '../../fe/icons/*.svg',
			tasks: ['shell:icons']
		},
		watch_js: {
			files: ["../../fe/*.js"],
			tasks: ["shell:js"]
		},
		watch_core_js: {
			files: ["../../Sword/*.js"],
			tasks: ["shell:js"]
		},
		watch_grunt_config: {
			files: ['Gruntfile.js'],
			options: {
				reload: false
			}
		}
	};

	if (!env.grunt.watchers.watch_all) {
		for (const k of Object.keys(env.grunt.watchers)) {
			if (k === 'watch_all') {
				continue;
			}

			if (!env.grunt.watchers[k]) {
				console.log(`Removing watch ${k}`);
				delete watchers[k];
			} else {
				console.log(`Applying watch ${k}`)
			}
		}
	} else {
		console.log('Applying all watchers');
	}

	const logsEnv = env.grunt.logs;
	const dontUseBashBuild = grunt.option('USE_BASH') === false;

	grunt.initConfig({
		/**
		 * All shell scripts are run with npm because all build scripts need project root folder context.
		 */
		shell: {
			js: {
				command: `npm run ${dontUseBashBuild ? 'win-' : ''}build-js`,
				options: {
					stdout: logsEnv.js || logsEnv.all
				}
			},
			styles: {
				command: `npm run ${dontUseBashBuild ? 'win-' : ''}build-styles`,
				options: {
					stdout: logsEnv.sass || logsEnv.all
				}
			},
			icons: {
				command: `npm run ${dontUseBashBuild ? 'win-' : ''}build-icons`,
				options: {
					stdout: logsEnv.icons || logsEnv.all
				}
			}
		},
		watch: watchers
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-shell');
};