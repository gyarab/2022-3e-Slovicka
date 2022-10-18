const express = require("express");
const path = require("path");
const fs = require("fs");
const env = require("../env.js");
const app = express();

let icons = fs.readFileSync(path.join(path.resolve(), 'gen/fe/icon-symbols.svg'));
const feWebsocket = env.reload_css_onsave ? `<script>${fs.readFileSync('./be/utils/cssRefreshWebsocket.js')}</script>`.replace('{{url}}', env.websocket_url) : '';
let indexContent = fs.readFileSync(path.join(path.resolve(), './be/templates/_index.html'), 'utf8');
indexContent = indexContent.replace('{{title}}', env.title);

let scripts = feWebsocket;

for (const c of env.importedScripts) {
	scripts += `<script src="${c}"></script>`
}

indexContent = indexContent.replace('{{scripts}}', scripts);
indexContent = indexContent.replace('{{icons}}', icons)


app.get('*', (req, res) => {
	res.set('Content-Type', 'text/html;charset=utf-8');
	res.set('Cache-Control', 'private, must-revalidate, max-age=60');
	res.send(indexContent);
});

module.exports = {app};