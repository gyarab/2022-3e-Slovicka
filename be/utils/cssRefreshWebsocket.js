async function connectToServer() {
	const ws = new WebSocket('{{url}}');
	return new Promise((resolve, reject) => {
		const timer = setInterval(() => {
			if(ws.readyState === 1) {
				clearInterval(timer)
				resolve(ws);
			}
		}, 10);
	});
}

(async function() {
	const ws = await connectToServer();

	ws.send(JSON.stringify({
		type: "ping",
		text: "hello",
		date: Date.now()
	}));

	ws.onmessage = (msg) => {
		if (msg.data === 'reload-css') {
			for (const link of document.querySelectorAll("link[rel='stylesheet']")) {
				link.href = link.href + '?' + Date.now()
			}
		}
	};
})();