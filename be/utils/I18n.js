class I18n {
	translations = {
		en: {
			password_reset: {
				'title': 'Password reset',
				'Password Reset': 'Password Reset',
				'If you have lost your password or wish to reset it, use link below to get started.': 'If you have lost your password or wish to reset it, use link below to get started.',
				'Reset Your Password': 'Reset Your Password',
				'text_under_button': 'If you did not request a password reset, you can safely ignore this email. Only \na person with access to your email can reset your account password.',
			},
			reminding_email: {
				'Your Streak': 'Your Streak',
				'close_streak': 'YOU\'RE SO CLOSE TO HITTING A 3-WEEK \n STREAK!',
				'subtitle': 'Your study streak will end soon. Click below and study another set to keep the streak up',
				'Vocabulary': 'Vocabulary'
			},
			signup_confirmation: {
				'title': 'Signup complete',
				'Hello!': 'Hello!',
				'THANK YOU FOR YOUR REGISTRATION': 'THANK YOU FOR YOUR REGISTRATION',
				'We hope you find Vocabulary helpful. Good luck!': 'We hope you find Vocabulary helpful. Good luck!',
				'Complete registration': 'Complete registration',
				'Unsubscribe': 'Unsubscribe',
				'Unsubscribe Preferences': 'Unsubscribe Preferences'
			},
			welcome_email: {
				'Welcome': 'Welcome',
				'title': 'Welcome to Vocabulary! Let\'s get started.',
				'subtitle_1': 'We are really happy you joined us.\n',
				'subtitle_2': 'We hope Vocabulary helps you with all your studying.',
				'subtitle_3': 'If you need any help click bellow\n',
				'TUTORIAL': 'TUTORIAL'
			}
		},
		cz: {
			password_reset: {
				'title': 'Obnova hesla',
				'Password Reset': 'Obnova hesla',
				'If you have lost your password or wish to reset it, use link below to get started.': 'Pokud jste ztratili vaše heslo nebo si ho přejete obnovit, klikněte na link níže.',
				'Reset Your Password': 'Obnovte vaše heslo',
				'text_under_button': 'Pokud jste si nepřáli obnovit heslo, můžete tento email ignorovat. Jenom \n člověk s přístupem k vašemu emailu může obnovit heslo od vašeho účtu.',
			},
			reminding_email: {
				'Your Streak': 'Váš Streak',
				'close_streak': 'Jste tak blízko k dosažení 3 týdennímu streaku.',
				'subtitle': 'Váš studijní streak bude brzy končit. Klikněte níže a studujte další lekci pro udržení streaku',
				'Vocabulary': 'Vocabulary'
			},
			signup_confirmation: {
				'title': 'Dokončení registrace',
				'Hello!': 'Vítejte!',
				'THANK YOU FOR YOUR REGISTRATION': 'Děkujeme vám za vaši registraci!',
				'We hope you find Vocabulary helpful. Good luck!': 'Doufáme, že pro vás bude Vocabulray užitečná. Hodně štěstí!',
				'Complete registration': 'Dkončete registraci',
				'Unsubscribe': 'Odhlásit',
				'Unsubscribe Preferences': 'Preference odhlášení'
			},
			welcome_email: {
				'Welcome': 'Vítejte',
				'title': 'Vítejte ve Vocabulary! Pojďtme začít.',
				'subtitle_1': 'Jsme velmi rádi, že jste se k nám přidali.\n',
				'subtitle_2': 'Doufáme, že vám Vocabulary pomůže s vaším studiem.',
				'subtitle_3': 'Pokud by jste potřebovali nějakou pomoc klikněte níže\n',
				'TUTORIAL': 'Návod'
			}
		}
	}

	getI18n(session) {
		return this.translations[session.lang];
	}
}

module.exports = {I18n: new I18n()}