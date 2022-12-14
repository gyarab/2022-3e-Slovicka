class AppLogo extends Sword {
	render() {
		this.el = this.createElement({
			nodeName: 'a',
			className: 'app-logo',
			href: "/",
			children: [{
				className: 'title',
				textContent: 'APP NAME'
			}],
			'on:click': e => {
				e.preventDefault();

				ROUTER.pushRoute('/');
			}
		})
	}
}

class AppHeader extends Sword {
	render() {
		this.el = this.createElement({
			nodeName: 'nav',
			className: 'header',
			children: [{
				className: 'page-centered-container',
				children: [{
					class: AppLogo
				},{
					className: 'tab-switcher',
					children: [{
						class: NavigationLink,
						text: i18n._('dashboard'),
						href: Routes.dashboard,
						activeOnRoutes: [Routes.dashboard]
					},{
						class: NavigationLink,
						text: i18n._('adventures'),
						href: Routes.adventures,
						activeOnRoutes: [Routes.adventures]
					},{
						class: NavigationLink,
						text: i18n._('statistics'),
						href: Routes.statistics,
						activeOnRoutes: [Routes.statistics]
					},{
						class: NavigationLink,
						text: i18n._('courses'),
						href: Routes.courses,
						activeOnRoutes: [Routes.courses]
					},{
						render: DataManager.userIsAtLeastEditor(),
						class: NavigationLink,
						text: i18n._('administration'),
						href: Routes.administration,
						activeOnRoutes: [Routes.administration]
					}]
				}, {
					class: UserProfile
				}],
			}],
		})
	}
}

class WillBeAdded extends Sword {
	render() {
		this.el = this.createElement({
			nodeName: 'h1',
			textContent: 'Will be added'
		})
	}
}

class Home extends SectionScreen {
	beforeRender() {
		this.defaultSection = Routes.dashboard;
		this.renderSideBar = false;
	}

	getRoutes() {
		return {
			adventures: Routes.adventures,
			dashboard: Routes.dashboard,
			courses: Routes.courses
		};
	}

	getSidebarMenu() {
		return [{
			nodeName: 'a',
			href: Routes.dashboard,
			screen: Dashboard,
		},{
			nodeName: 'a',
			href: Routes.adventures,
			screen: Adventures,
		},{
			nodeName: 'a',
			href: Routes.courses,
			screen: Courses,
		}]
	}

	getHeader() {
		return {
			class: AppHeader
		}
	}
}

const Routes = {
	home: '/home',
	login: '/login',
	signup: '/signup',
	forgotten_password: '/forgotten-password',
	password_reset: '/password-reset',
	account_activate: '/account-activate',
	password_restore: '/password-restore',
	dashboard: '/home/dashboard',
	adventures: '/home/adventures',
	courses: '/home/courses',
	my_profile: '/my_profile',
	my_profile_pass: '/my_profile/change-password',
	administration: '/administration',
	administration_images: '/administration/images',
	administration_users: '/administration/users',
	administration_adventures: '/administration/adventures',
	administration_languages: '/administration/languages',
	adventure_mode: '/administration/adventure_mode',
	terms_of_service: '/terms-of-service',
	privacy_policy: '/privacy-policy',
	courses_editor: '/courses/editor',
	adventure_editor: '/adventures/editor',
	adventure_node_editor: '/adventures/editor/node',
	tutorial: '/tutorial',
	flipCards: '/courses/{course:int}/flip-cards',
	testWordsCourses: '/courses/{course:int}/test-words',
	testWordsAdventures: '/adventures/{course:int}/test-words/{node:int}',
	wordsGoThrewModeSelect: '/courses/{course:int}/mode',

	statistics: '/statistics',
	statisticsWordsKnown: '/statistics/word-known',
	statisticsTrophies: '/statistics/trophies',
	statisticsLearningTime: '/statistics/learning-time',
	statisticsCoursesCompleted: '/statistics/courses-completed',
}
new Startup(async match => {
	if (match.route.group === 'public') {
		i18n.init();
		return;
	}

	const session = DataManager.session || await DataManager.initSession();
	i18n.init(session?.lang);

	if (match.route.group.includes('administration') && DataManager.userIsNotAdmin()) {
		ROUTER.pushRoute(Routes.home);
		return true;
	}

	if (!session && match.route.group.includes('auth')) {
		ROUTER.pushRoute(Routes.login);
		return true;
	}

	if (session) {
		if (match.route.studying) {
			DataManager.io.emit('course_start_studying', match.captures.course);
		} else {
			// Error thrown if no session is active is ignored
			DataManager.io.emit('course_end_studying');
		}
	}
}, [{
	group: 'auth',
	path: '/',
	async handler({params}) {
		APP.show({
			class: Home
		})
	}
},{
	group: 'auth',
	path: Routes.home,
	async handler({params}) {
		APP.show({
			class: Home
		})
	}
},{
	group: 'auth',
	path: Routes.home + '/{section:str}',
	async handler({captures}) {
		APP.show({
			class: Home,
			section: captures.section
		})
	}
},{
	group: 'auth',
	path: Routes.statistics,
	async handler({captures}) {
		APP.show({
			class: Statistics
		})
	}
},{
	group: 'auth',
	path: Routes.statistics + '/{section:str}',
	async handler({captures}) {
		APP.show({
			class: Statistics,
			section: captures.section
		})
	}
},{
	group: 'auth',
	path: Routes.adventures,
	async handler({captures}) {
		APP.show({
			class: Adventures
		})
	}
},{
	group: 'auth',
	path: Routes.adventures + '/{id:int}',
	async handler({captures}) {
		APP.show({
			class: AdventureNodes,
			id: captures.id
		})
	}
},{
	group: 'auth',
	path: Routes.wordsGoThrewModeSelect,
	async handler({captures}) {
		APP.show({
			class: WordsGoThrewModeSelect,
			course: captures.course
		})
	}
},{
	group: 'auth',
	path: '/tutorial/{section:str}',
	async handler({captures}) {
		let tut = null;

		switch (captures.section) {
			case '0':
				tut = Tutorial1;
				break;
			case '1':
				tut = Tutorial2;
				break;
			case '2':
				tut = Tutorial3;
				break;
			default:
				tut = Tutorial1
		}

		APP.show({
			class: tut
		})
	}
}, {
	group: 'auth',
	path: '/my_profile',
	async handler({captures}) {
		APP.show({
			class: MyProfile,
			section: 'change-password'
		});
	}
},{
	studying: true,
	group: 'auth',
	path: Routes.testWordsCourses,
	async handler({captures}) {
		APP.show({
			class: TestWordsCourses,
			id: captures.course,
		})
	}
},{
	studying: true,
	group: 'auth',
	path: Routes.testWordsAdventures,
	async handler({captures}) {
		APP.show({
			class: TestWordsAdventures,
			id: captures.course,
			node: captures.node
		})
	}
}, {
	group: 'auth',
	path: '/my_profile/{screen:str}',
	async handler({captures}) {
		APP.show({
			class: MyProfile,
			section: captures.screen
		});
	}
},{
	group: 'auth-administration',
	path: Routes.adventure_editor + '/{adventure:int}',
	async handler({captures}) {
		APP.show({
			class: AdventureNodesEditor,
			id: captures.adventure
		});
	}
},{
	group: 'auth',
	path: Routes.courses_editor,
	async handler({captures}) {
		APP.show({
			class: CourseEditor
		});
	}
},{
	group: 'public',
	path: Routes.tutorial,
	async handler({}) {
		ROUTER.pushRoute(Routes.tutorial + '/0');
	}
},{
	group: 'auth-administration',
	path: Routes.adventure_node_editor + '/{course:int}',
	async handler({captures}) {
		const level = BrowserUtils.getSearchParam('level') || 0;

		APP.show({
			class: AdventureNodeEditor,
			course: captures.course,
			level
		});
	}
},{
	group: 'auth-administration',
	path: Routes.adventure_node_editor + '/{course:int}/{node:int}',
	async handler({captures}) {
		APP.show({
			class: AdventureNodeEditor,
			course: captures.course,
			node: captures.node
		});
	}
},{
	group: 'auth',
	path: Routes.courses_editor + '/{course:int}',
	async handler({captures}) {
		APP.show({
			class: CourseEditor,
			id: captures.course
		});
	}
},{
	studying: true,
	group: 'auth',
	path: Routes.flipCards,
	async handler({captures}) {
		APP.show({
			class: FlipCards,
			id: captures.course
		})
	}
}, {
	group: 'auth-administration',
	path: Routes.administration,
	async handler({captures}) {
		APP.show({
			class: Administration,
			section: 'customers'
		});
	}
}, {
	group: 'auth-administration',
	path: '/administration/{screen:str}',
	async handler({captures}) {
		APP.show({
			class: Administration,
			section: captures.screen
		});
	}
},{
	group: 'public',
	path: Routes.login,
	async handler({}) {
		APP.show({
			class: LoginForm
		})
	}
},{
	group: 'public',
	path: Routes.signup,
	async handler({}) {
		APP.show({
			class: SignupForm
		})
	}
},{
	group: 'public',
	path: Routes.forgotten_password,
	async handler() {
		APP.show({
			class: ForgottenPasswordForm
		})
	}
},{
	group: 'public',
	path: Routes.account_activate,
	async handler() {
		const token = BrowserUtils.getSearchParam('account-activate');

		try {
			await REST.POST('users/account-activate', {token});

			NOTIFICATION.showStandardizedSuccess(i18n._('signup_complete'))
		} catch (ex) {
			NOTIFICATION.showStandardizedError(i18n._('signup_failure'));
		}

		ROUTER.pushRoute(Routes.login);
	}
},{
	group: 'public',
	path: Routes.password_restore,
	async handler() {
		const token = BrowserUtils.getSearchParam('password-restore');

		APP.show({
			class: PasswordRestoreForm,
			token
		})
	}//
},{
	group: 'public',
	path: Routes.privacy_policy,
	async handler() {
		APP.show({
			class: PrivacyPolicyIllustrative
		})
	}
},{
	group: 'public',
	path: Routes.terms_of_service,
	async handler() {
		APP.show({
			class: TermsOfServiceIllustrative
		})
	}
}], () => {});