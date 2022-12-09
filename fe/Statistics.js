class StatisticsScreen extends Sword {
	beforeRender() {
		this.title ??= ''
		this.chartLabel ??= '';
	}

	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				className: 'header',
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
		this.title = 'Known words';
		this.chartLabel = 'Number of known words';
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
		this.title = 'Learned time';
		this.chartLabel = 'Learned time (in minutes)';
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


class Statistics extends SectionScreen {
	beforeRender() {
		this.defaultSection = Routes.statisticsWordsKnown;
	}

	getRoutes() {
		return {
			'word-known': Routes.statisticsWordsKnown,
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
			screen: WillBeAdded
		}]
	}
}