const redisClient = require('../utils/redis');

const dbClient = require('../utils/db');

const fs = require('fs');

const uuid = require('uuid');

const path = require('path');

const { ObjectId } = require('mongodb');

const mime = require('mime-types');

const nodemailer = require('nodemailer');

const Queue = require('bull');

const queue = new Queue('fileQueue');

class FilesController {
  static async postUpload (req, res) {
    const acceptedType = ['folder', 'file', 'image'];
    const tokenHeader = req.headers['x-token'];
    const userID = await FilesController.getUserId(`auth_${tokenHeader}`);
    if (!userID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!req.body.name) {
      return res.status(400).send({error: 'Missing name'});
    }
    if (!req.body.type || !acceptedType.includes(req.body.type)) {
      return res.status(400).send({error: 'Missing type'});  
    }
    if (!req.body.data && req.body.type !== 'folder') {
      return res.status(400).send({error: 'Missing data'});
    }
    const parentId = req.body.parentId ? req.body.parentId: '0';
    if (parentId !== '0') {
      return dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) })
        .then((file) => {
          if (!file) {
	    return res.status(400).send({ error: 'Parent not found' });
          }
	  if (file.type != 'folder') {
	    return res.status(400).send({ error: 'Parent is not a folder'});
	  } else {
            return FilesController.writeToFile(req, res, parentId, userID);
	  }
        })
	.catch(() => res.status(401).send({ error: 'error'}))
    } else {
      console.log(`I am zero so am inside here`);
      return FilesController.writeToFile(req, res, parentId, userID);
    }
 }

  static async getUserId (authToken) {
    return redisClient.get(authToken)
      .then((userId) => {
        if (userId) {
          return userId;
        }
        return null;
      })
      .catch(() => null);
  }
  static async writeToFile (req, res, parentId, userID) {

    const { name, type } = req.body;
    const isPublic = req.body.isPublic ? req.body.isPublic: false;
    const userIdObject = ObjectId(userID);
    let parentIdToStore;
    if (parentId === '0') {
      parentIdToStore = '0';
    } else {
      parentIdToStore = ObjectId(parentId);
    }
    if (req.body.data && (req.body.type === 'file' || req.body.type === 'image')) {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const filePath = uuid.v4().toString();
      const fullPath = path.join(folderPath, filePath);
      const decodedData = Buffer.from(req.body.data, 'base64');
      console.log('My data body contains data so am here')
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, {recursive: true});
      }
      await fs.promises.writeFile(fullPath, decodedData, 'binary')
      const object = {
        userId: userIdObject,
        name,
	type,
	isPublic,
	parentId: parentIdToStore,
	localPath: fullPath,
      }
      return dbClient.db.collection('files').insertOne(object)
        .then((output) => {
          if (output) {
	    console.log(output.insertedId)
	    console.log(object.userId)
            queue.add({fileId: output.insertedId, userId: object.userId });
            return res.status(201).send({
              id: output.insertedId.toString(), 
              userId: object.userId.toString(),
              name: object.name,
	      type: object.type,
              isPublic: object.isPublic,
              parentId: parentId === '0' ? 0 : parentId,
	    })
	  }
	})
	.catch(() => res.status(401).send({ error: 'error'}))
    } else {
      const object = {
        userId: userIdObject,
	name,
	type,
	isPublic,
	parentId: parentIdToStore,
      }
      return dbClient.db.collection('files').insertOne(object)
        .then((output) => {
          if (output) {
	    fileQueue.add({fileId: file._id, userId: file.userId });
            return res.status(201).send({
              id: output.insertedId.toString(),
	      userId: object.userId.toString(),
	      name: object.name,
              type: object.type,
              isPublic: object.isPublic,
              parentId: parentId === '0' || output.parentId === 0 ? 0 : output.parentId.toString(),
	    })
	  }
	})
	.catch(() => res.status(401).send({ error: 'error'}))
    }    
  }
  static async getShow(req, res) {
    const tokenHeader = req.headers['x-token'];
    const userID = await FilesController.getUserId(`auth_${tokenHeader}`);
    if (!userID) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const idPassed = req.params.id;
    const output = await dbClient.db.collection('files').findOne({ _id: ObjectId(idPassed), userId: ObjectId(userID) });
    if (output) {
      return res.status(200).send({
        id: output._id.toString(),
	userId: output.userId.toString(),
	name: output.name,
	type: output.type,
	isPublic: output.isPublic,
	parentId: output.parentId === '0' || output.parentId === 0 ? 0 : output.parentId.toString(),
      })
    } else {
      return res.status(404).send({ error: 'Not found'});
    }
  }
  static async getIndex(req, res) {
    const tokenHeader = req.headers['x-token'];
    const userId = await FilesController.getUserId(`auth_${tokenHeader}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const obj = {userId: ObjectId(userId)};
    if (req.query.parentId === undefined || req.query.parentId === '0' || req.query.parentId === 0) {
      obj.parentId = '0';
    } else {
      obj.parentId = ObjectId(req.query.parentId);
    }
	
    const page = Number(req.query.page) || 0;
    const mongoPipeline = [
      { $match: obj },
      { $skip : page * 20 },
      { $limit: 20 },
    ];
    const arrayFiles = await dbClient.db.collection('files').aggregate(mongoPipeline).toArray();
    const processedFiles = arrayFiles.map((file) => ({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic || false,
      parentId: file.parentId.toString(),
    }));  
    return res.status(200).send(processedFiles);
  }
  /*
     file.parentId === '0' ||
        file.parentId === 0 ||
        (file.parentId && file.parentId.toString() === '0')
          ? '0' // Return '0' as string
          : file.parentId.toString(),
  */
  static async putPublish(req, res) {
    const tokenHeader = req.headers['x-token'];
    const userId = await FilesController.getUserId(`auth_${tokenHeader}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const id = req.params.id;
    const queryObject = {
      _id: ObjectId(id),
      userId: ObjectId(userId),
    }
    const foundDoc = await dbClient.db.collection('files').findOne(queryObject);
    if (foundDoc) {
      const updateValue = await dbClient.db.collection('files').updateOne(queryObject, { $set: {isPublic: 'true'} });
      if (updateValue.matchCount === 0) {
        return res.status(404).send({ error: 'Not found' });
      }
      if (updateValue.modifiedCount !== 0) {
        return res.status(200).send({
          _id: foundDoc._id.toString(),
          userId: foundDoc.userId.toString(),
          name: foundDoc.name.toString(),
          type: foundDoc.type.toString(),
          isPublic: true,
          parentId: foundDoc.parentId.toString(),
        });
      }
    } else {
      return res.status(404).send({ error: 'Not found' }); 
    }
  }

  static async putUnpublish(req, res) {
    const tokenHeader = req.headers['x-token'];
    const userId = await FilesController.getUserId(`auth_${tokenHeader}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const queryObject = {
      _id: ObjectId(req.params.id),
      userId: ObjectId(userId),
    }
    const foundDoc = await dbClient.db.collection('files').findOne(queryObject);
    if (foundDoc) {
      const updateValue = await dbClient.db.collection('files').updateOne(queryObject, { $set: {isPublic: 'false'}});
      if (updateValue.matchedCount === 0) {
        return res.status(404).send({ error: 'Not found' });
      }
      if (updateValue.modifiedCount !== 0) {
        return res.status(200).send({
          id: foundDoc._id.toString(),
          userId: foundDoc.userId.toString(),
          name: foundDoc.name.toString(),
          type: foundDoc.type.toString(),
          isPublic: false,
          parentId: foundDoc.parentId.toString(),
        })
      }
    } else {
      return res.status(404).send({ error: 'Not found' });
    }
  }
  
  static async getFile(req, res) {
    if (req.params.id === undefined) {
      return res.status(404).send({ error: 'Not found' });
    }
    let Id;
    try {
        Id = ObjectId(req.params.id);
    } catch (error) {
        return res.status(400).send({ error: 'Invalid ID format' });
    } 
    const file = await dbClient.db.collection('files').findOne({_id: Id});
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }
    const userID = req.headers['x-token'];
    const userId = await FilesController.getUserId(`auth_${userID}`);
    if (file.isPublic === false && (!userId || userId.toString() !== file.userId.toString())) {
      return res.status(404).send({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).send({ error: 'A folder doesn\'t have content'});
    }
    if (!file.localPath || !fs.existsSync(file.localPath)) {
      return res.status(404).send({ error: 'Not found' });
    }
    const contentType = mime.contentType(file.name);
    res.setHeader('Content-Type', contentType);
    return res.status(200).sendFile(file.localPath);
  }
}
module.exports = FilesController;
