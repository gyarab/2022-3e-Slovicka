const express = require('express');
const SQLBuilder = require('./utils/SQLBuilder');
const env = require('./env');

const multer  = require('multer')
const {parseId} = require("./utils/utils");
const {NotFound, BadRequest} = require("./utils/aexpress");
const {validateStringNotEmpty} = require("./utils/validations");
const fs = require("fs");
const upload = multer({ dest: env.datadir })

const app = express();
const db = new SQLBuilder();

async function uploadFile(user, file) {
	return await db.insert('files', {
		uploader: user.id,
		filename: file.originalname,
		original_filename: file.originalname,
		type: file.mimetype,
		size: file.size,
		storage_path: file.path
	})
		.oneOrNone();
}

async function getPicture(id) {
	return await db.select()
		.from('adventure_node_pictures AS anp', 'INNER JOIN files ON anp.file = files.id')
		.where('anp.id = ?', id)
		.oneOrNone();
}

async function validateAdventureNodePictureExists(id) {
	const picture = await getPicture(id);

	if (!picture) {
		throw new NotFound();
	}

	return picture;
}

app.post_upload('/adventure-node-pictures', upload.array('file', 1), async (req) => {
	const {name} = req.body;
	const image = req.files[0];

	if (image.mimetype !== 'image/svg+xml') {
		fs.unlinkSync(image.path);
		throw new BadRequest('Wrong image format', 'wrong_image_format');
	}

	const file = await uploadFile(req.session, image);
	const picture = await db.insert('adventure_node_pictures', {
		file: file.id,
		name: name
	}).oneOrNone();

	return await getPicture(picture.id);
});

app.get_json('/adventure-node-pictures/list', async req => {
	return await db.select()
		.from('adventure_node_pictures AS anp', 'INNER JOIN files ON files.id = anp.file')
		.getList();
});

app.get_json('/adventure-node-pictures/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);

	return await validateAdventureNodePictureExists(id);
});

app.put_json('/adventure-node-pictures/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);
	const {name} = req.body;

	validateStringNotEmpty(name, 'Name');
	await validateAdventureNodePictureExists(id);

	await db.update('adventure_node_pictures')
		.set({name})
		.whereId(id)
		.oneOrNone();

	return await getPicture(id);
});

app.delete_json('/adventure-node-pictures/:id([0-9]+)', async req => {
	const id = parseId(req.params.id);

	await validateAdventureNodePictureExists(id);
	await db.deleteById('adventure_node_pictures', id);
});

module.exports = {app, validateAdventureNodePictureExists};