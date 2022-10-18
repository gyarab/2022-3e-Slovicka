const fs = require("fs");

let ICON_SIZES_JS = 'ICON_SIZES = {';
let ICON_SIZES_SASS = '$icon-sizes: (';
let icons = '';

fs.readdir(process.env.ICONS_DIR, (err, files) => {
	for (const f of files) {
		if (f.endsWith('.svg')) {
			const id = f.replace('.svg', '');

			let xml = fs.readFileSync(process.env.ICONS_DIR + '/' + f, { encoding: 'utf8' });
			xml = xml.replace('<svg', `<symbol id="icon-${id}"`);
			xml = xml.replace(/<\/svg>/g, '</symbol>');
			xml = xml.replace(/<\?xml version="1\.0" encoding="UTF-8"\?>/gi, '');

			const m = /viewBox="([0-9\s]*)"/g.exec(xml);
			const nums = m[1].split(' ');
			ICON_SIZES_JS += `"${id}": ["${m[1]}", ${nums[2]}, ${nums[3]}], `;
			ICON_SIZES_SASS += `"${id}": ${nums[2]} ${nums[3]}, `

			icons += xml;
		}
	}

	ICON_SIZES_SASS += ')';
	ICON_SIZES_JS += '}';

	fs.writeFileSync(process.env.ICONS_OUT_JS, ICON_SIZES_JS);
	fs.writeFileSync(process.env.ICONS_OUT_SASS, ICON_SIZES_SASS);
	fs.writeFileSync(process.env.ICONS_OUT_SVG, `
		<svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="icons" style="height: 0; width: 0; position: absolute; visibility: hidden;">
			${icons}
		</svg>
	`);
});