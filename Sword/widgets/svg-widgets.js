class CircularProgress extends SVGSword {
	beforeRender() {
		this.percentage ??= 0;
	}

	render() {
		this.el = this.createElement({
			nodeName: 'svg',
			class: 'circular-progress',
			viewBox: '0 0 60 60',
			children: [{
				nodeName: 'text',
				ref: 'progressText',
				x: 30,
				y: 30,
				'text-anchor': 'middle',
				dy: '.33em',
				class: 'progress-text'
			},{
				nodeName: 'circle',
				cx: 30,
				cy: 30,
				r: 25,
				'stroke-width': 2,
				fill: 'none',
				class: 'background-circle'
			},{
				nodeName: 'circle',
				ref: 'progressCircle',
				cx: 30,
				cy: 30,
				r: 25,
				fill: 'none',
				transform: 'rotate(-90, 30, 30)',
				'stroke-width': 2,
				class: 'progress-circle'
			}]
		}, this);

		this.setPercentage(this.percentage);
	}

	setPercentage(percentage) {
		this.percentage = percentage;

		const circumference = 2 * Math.PI * 25;
		const arc = circumference * (percentage / 100);

		this.progressCircle.setAttribute('stroke-dasharray', circumference);
		this.progressCircle.setAttribute('stroke-dashoffset', circumference - arc);

		this.progressText.textContent = percentage + '%';
	}
}

class LinearProgress extends SVGSword {
	beforeRender() {
		this.percentage ??= 0;
	}

	render() {
		this.el = this.createElement({
			nodeName: 'svg',
			class: 'linear-progress',
			viewBox: '0 0 100 10',
			preserveAspectRatio: 'none',
			children: [{
				nodeName: 'line',
				x1: 0,
				y1: 5,
				x2: 100,
				y2: 5,
				'stroke-width': 10,
				class: 'background-line'
			}, {
				nodeName: 'line',
				ref: 'progressLine',
				x1: 0,
				y1: 5,
				x2: this.percentage,
				y2: 5,
				'stroke-width': 10,
				class: 'progress-line'
			}]
		}, this);
	}

	setPercentage(percentage) {
		this.percentage = percentage;
		this.progressLine.setAttribute('x2', percentage);
	}
}