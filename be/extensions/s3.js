const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3-v2');
const env = require('../env');

const spacesEndpoint = new aws.Endpoint(env.s3.endpoint);

const creds = new aws.Credentials({
	accessKeyId: env.s3.access_key_id,
	secretAccessKey: env.s3.secret_access_key
});

const s3 = new aws.S3({
	endpoint: spacesEndpoint,
	credentials: creds
});

// Change bucket property to your Space name
const upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: env.s3.bucket,
		acl: 'private',
		key: function (req, file, cb) {
			file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
			cb(null, file.originalname + Date.now().toString() + file.originalname);
		}
	})
});

async function getFile(key) {
	return await s3
		.getObject({
			Bucket: env.s3.bucket,
			Key: key
		})
		.promise();
}

async function deleteFile(key) {
	return await s3
		.deleteObject({
			Bucket: env.s3.bucket,
			Key: key
		})
		.promise();
}

module.exports = {upload, getFile, deleteFile};