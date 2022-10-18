module.exports = {

	/**
	 * System envs
	 */
	host: process.env.APP_BIND_HOST || "localhost",
	port: process.env.APP_BIND_PORT || process.env.PORT || 3331,
	url: process.env.APP_URL || `http://${process.env.APP_BIND_HOST || "localhost"}:${process.env.APP_BIND_PORT || 3331}`,
	session_cookie_name: 'vocabulary-x-session',
	lang_cookie_name: 'vocabulary-x-lang',
	datadir: './data',

	useProxy: false,
	proxy_url: process.env.APP_PROXY_URL || `http://${process.env.APP_BIND_HOST || "localhost"}:${process.env.APP_BIND_PORT || 3331}/`,
	reload_css_onsave: false,

	websocket_port: process.env.APP_WEBSOCKET_BIND_PORT || 4449,
	websocket_url: process.env.APP_WEBSOCKET_BIND_URL || `ws://localhost:${process.env.APP_WEBSOCKET_BIND_PORT || 3332}/ws`,

	//Postgresql database
	pg: {
		host: process.env.BCCP_TTS_PGSQL_HOST || 'localhost',
		port: Number(process.env.BCCP_TTS_PGSQL_PORT) || 5432,
		pass: process.env.BCCP_TTS_PGSQL_PASSWORD || 'vocabulary',
		user: process.env.BCCP_TTS_PGSQL_USER || 'vocabulary',
		db: process.env.BCCP_TTS_PGSQL_DB || 'vocabulary',
		sslmode: process.env.PG_REQUIRE_SSL || false
	},

	mailer: {
		email: process.env.SB_SMTP_EMAIL  || 'dev@email.cz',
		password: process.env.SB_SMTP_PASSWORD || 'Heslo123',
		smtp_host: process.env.SB_SMTP_HOST  || 'your.host.cz'
	},

	sendgrid: {
		api_key: process.env.SENDGRID_API_KEY || 'your.key',
		templates: {
			password_recovery: process.env.PASSWORD_RECOVERY_TEMPLATE_ID|| '',
			signup_confirmation: process.env.SIGNUP_CONFIRMATION_TEMPLATE_ID || ''
		}
	},

	grunt: {
		watchers: {
			watch_all: false,
			watch_core_js: true,
			watch_js: true,
			watch_sass: true,
			watch_icons: false,
			watch_grunt_config: true,
		},
		logs: {
			all: false,
			js: true,
			sass: false,
			icons: true
		},
	},

	/**
	 * TODO
	 * @type {'production'|'debug'}
	 */
	mode: 'debug',

	/**
	 * FE envs
	 */
	title: 'Sword demo',

	// TODO here should be websockets for css refresh
	importedScripts: [],

	users: {
		verify_email_address: process.env.VERIFY_USER_EMAIL_ADDRESS || true
	}
};