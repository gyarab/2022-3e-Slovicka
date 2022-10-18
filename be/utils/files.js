const express = require('express');
const {ApiError} = require("./aexpress.js");
const {parseId} = require("./utils.js");
const fs = require('fs');
const SQLBuilder = require('./SQLBuilder');
const {validateStringNotEmpty} = require("./validations");
const {upload, getFile, deleteFile} = require('../extensions/s3');
const {Readable} = require('stream');

const app = express();
const db = new SQLBuilder();


async function uploadFile(user, file) {
	return await db.insert('files', {
		uploader: user.id,
		filename: file.originalname,
		original_filename: file.originalname,
		type: file.mimetype,
		size: file.size,
		storage_path: file.location,
		key: file.key
	})
		.oneOrNone();
}

async function checkFileAccess(req) {
	const id = parseId(req.params.id);
	const file = await db.oneOrNoneById('files', id);

	if (!file) {
		throw new ApiError(404, 'File not found');
	}

	if (file.uploader !== req.session.id) {
		throw new ApiError(401);
	}

	return file;
}

app.post_upload('/files', upload.array('file', 1), async (req) => await uploadFile(req.session, req.files[0]));
app.post_upload('/files/list', upload.array('file'), async (req) => {
	const files = [];

	for (const f of req.files) {
		files.push(await uploadFile(req.session, f));
	}

	return files;
});

app.get_file('/files/:id([0-9]+)', async (req, res) => {
	const file = await checkFileAccess(req);

	res.writeHead(200, {
		'Cache-Control': 'no-cache',
		'Content-Type': 'html/text',
		'Content-Length': file.size,
		'Content-Disposition': `attachment`
	});

	const fileX = fs.createReadStream(file.storage_path)
	fileX.pipe(res)
});

app.get_file('/files/download/:id([0-9]+)', async (req, res) => {
	const file = await checkFileAccess(req);
	const s3File = await getFile(file.key);
	const stream = Readable.from(s3File.Body);

	const range = (req.headers.range || 'bytes=0-');
	const positions = range.replace(/bytes=/, "").split("-");
	const start = parseInt(positions[0], 10);
	const end = positions[1] !== '' ? parseInt(positions[1], 10) : file.size - 1;

	res.writeHead(file.type.includes('video') ? 206 : 200, {
		"Content-Range": `bytes ${start}-${end}/${file.size}`,
		"Accept-Ranges": "bytes",
		"Content-Length": (end - start) + 1,
		"Content-Type": file.type
	});
	stream.pipe(res);
});

app.get_json('/files', async (req) => {
	return await db.select('files')
		.where('uploader = ?', req.session.id)
		.getList();
});

app.delete_json('/files/:id([0-9]+)', async req => {
	const file = await checkFileAccess(req);

	await deleteFile(file.key);

	await db.deleteById('files', file.id);
});

app.put_json('/files/:id([0-9]+)', async req => {
	const {filename} = req.body;

	validateStringNotEmpty(filename, 'Filename');

	const file = await checkFileAccess(req);

	return await db.update('files')
		.set('filename', filename)
		.where('id = ?', file.id)
		.oneOrNone();
})

module.exports = {app};