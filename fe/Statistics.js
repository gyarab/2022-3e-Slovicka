class WordsKnown extends Sword {
	render() {
		this.el = this.createElement({
			is: CUSTOM_ELEMENT.DIV,
			children: [{
				className: 'header',
				children: [{
					nodeName: 'h3',
					textContent: 'Known words'
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
		const [days, counts] = await this.prepareChartData(this.from.getValue(), this.to.getValue())
		this.chart.data.datasets[0].data = counts;
		this.chart.data.labels = days;
		this.chart.update();
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

	async connect() {
		const [days, counts] = await this.prepareChartData()

		this.chart = new Chart(this.chartEl, {
			type: 'bar',
			data: {
				labels: days,
				datasets: [{
					label: i18n._('Number of known words'),
					data: counts,
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
			screen: WillBeAdded
		},{
			nodeName: 'a',
			className: 'item',
			children: [this.useIcon('users'), i18n._('courses_completed')],
			href: Routes.statisticsCoursesCompleted,
			screen: WillBeAdded
		}]
	}
}