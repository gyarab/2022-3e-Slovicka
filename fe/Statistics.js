class StatisticsScreen extends Sword {
	beforeRender() {
		this.title ??= ''
		this.chartLabel ??= '';
	}

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				className: 'responsive-header header',
				children: [{
					nodeName: 'h3',
					textContent: i18n._(this.title)
				},{
					class: TextField,
					type: 'date',
					label: i18n._('from'),
					ref: 'from',
					'on:change': () => this.updateStatisticsSpan()
				},{
					class: TextField,
					type: 'date',
					label: i18n._('to'),
					ref: 'to',
					'on:change': () => this.updateStatisticsSpan()
				}]
			},{
				className: 'chart',
				children: [{
					nodeName: 'canvas',
					ref: 'chartEl'
				}]
			}]
		}, this);
	}

	async updateStatisticsSpan() {
		const [labels, values] = await this.prepareChartData(this.from.getValue(), this.to.getValue())
		this.chart.data.datasets[0].data = values;
		this.chart.data.labels = labels;
		this.chart.update();
	}

	async prepareChartData(from, to) {}

	async connect() {
		const [labels, values] = await this.prepareChartData()

		this.chart = new Chart(this.chartEl, {
			type: 'bar',
			data: {
				labels: labels,
				datasets: [{
					label: i18n._(this.chartLabel),
					data: values,
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
	}
}

class WordsKnown extends StatisticsScreen {
	beforeRender() {
		this.title = 'words_known';
		this.chartLabel = 'number_of_known_words';
	}

	async prepareChartData(from, to) {
		const fromFormatted = from ? '&from=' + from : '';
		const toFormatted = to ? '&to=' + to : '';

		const data = await REST.GET(`statistics/words_known?asGraph=true${fromFormatted + toFormatted}`);
		const days = [], counts = [];

		for (const r of data) {
			const d = new Date(r.changed);

			days.push(`${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`);
			counts.push(r.count);
		}

		return [days, counts];
	}
}

class LearnedTimeStatistics extends StatisticsScreen {
	beforeRender() {
		this.title = 'learning_time';
		this.chartLabel = 'learning_time_minutes';
	}

	async prepareChartData(from, to) {
		const fromFormatted = from ? '&from=' + from : '';
		const toFormatted = to ? '&to=' + to : '';

		const data = await REST.GET(`statistics/learning_time?asGraph=true${fromFormatted + toFormatted}`);
		const days = [], counts = [];

		for (const r of data) {
			const d = new Date(r.from);

			days.push(`${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`);

			const learning = r.learning;
			const sum = (learning.hours || 0) * 60 + (learning.minutes || 0) + (learning.seconds || 0) / 60;
			counts.push(Math.ceil(sum));
		}

		return [days, counts];
	}
}

class TrophyScreen extends Sword {
	render() {
		this.wordsKnownCounts = [100, 500, 1000, 5000];
		this.hoursLearned = this.coursesCompleted = [1, 5, 10, 100];

		this.el = this.createElement({
			children: [{
				nodeName: 'h2',
				textContent: i18n._('Trophies')
			},{
				children: this.renderSection('Words known', 'wordsKnown', this.wordsKnownCounts).concat(
					this.renderSection('Hours learned', 'hoursLearned', this.hoursLearned),
					this.renderSection('Courses completed', 'coursesCompleted', this.coursesCompleted),
				)
			}]
		}, this);

		this.getStatistics();
	}

	activateStatistics(prefix, counts, count) {
		for (const c of counts) {
			if (c <= count) {
				this[prefix + c].style.opacity = 1;
			}
		}
	}

	async getStatistics() {
		const wordsKnown = await REST.GET(`statistics/words_known`);
		this.activateStatistics('wordsKnown', this.wordsKnownCounts, wordsKnown);

		const coursesCompleted = await REST.GET(`statistics/course-nodes-completion`);
		this.activateStatistics('coursesCompleted', this.coursesCompleted, coursesCompleted);

		const learningTime = await REST.GET(`statistics/learning_time`);
		const hours = (learningTime.days || 0) * 24 + (learningTime.hours || 0);
		this.activateStatistics('hoursLearned', this.hoursLearned, hours);
	}

	renderSection(title, prefix, counts) {
		return [{
			nodeName: 'h4',
			textContent: i18n._(title)
		},{
			className: 'trophies-list',
			children: counts.map(count => ({
				ref: prefix + count,
				className: 'trophy',
				nodeName: 'img',
				src: `/images/achievement_${count}.svg`
			}))
		}]
	}
}

class CompletedCoursesStatistics extends StatisticsScreen {
	beforeRender() {
		this.title = 'courses_completed';
		this.chartLabel = 'courses_completed_count';
	}

	async prepareChartData(from, to) {
		const fromFormatted = from ? '&from=' + from : '';
		const toFormatted = to ? '&to=' + to : '';

		const data = await REST.GET(`statistics/course-nodes-completion?asGraph=true&${fromFormatted + toFormatted}`);
		const dates = [], counts = [];

		for (const r of data) {
			const d = new Date(r.when);
			dates.push(`${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`);
			counts.push(r.number_of_completion);
		}

		return [dates, counts];
	}
}

class Statistics extends SectionScreen {
	beforeRender() {
		this.defaultSection = Routes.statisticsTrophies;
	}

	getRoutes() {
		return {
			'word-known': Routes.statisticsWordsKnown,
			'trophies': Routes.statisticsTrophies,
			'learning-time': Routes.statisticsLearningTime,
			'courses-completed': Routes.statisticsCoursesCompleted
		};
	}

	getHeader() {
		return {
			class: AppHeader
		}
	}

	getSidebarMenu() {
		return [{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('book'), i18n._('trophies')],
			href: Routes.statisticsTrophies,
			screen: TrophyScreen
		},{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('book'), i18n._('words_known')],
			href: Routes.statisticsWordsKnown,
			screen: WordsKnown
		},{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('book'), i18n._('learning_time')],
			href: Routes.statisticsLearningTime,
			screen: LearnedTimeStatistics
		},{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('users'), i18n._('courses_completed')],
			href: Routes.statisticsCoursesCompleted,
			screen: CompletedCoursesStatistics
		}]
	}
}