/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable consistent-return */

//import sha1 from 'sha1';

const sha1 = require('sha1');
//import { ObjectId } from 'bson';

const { ObjectId } = require('bson');

const mongo = require('../utils/db');

const redis = require('../utils/redis');

const nodemailer = require('nodemailer');

const Queue = require('bull');

const sendQueue = new Queue('sendEmail');

const queue = new Queue('fileQueue');

const uuid = require('uuid');

exports.postNew = (req, res) => {
  const username = req.body ? req.body.username : null;
  const email = req.body ? req.body.email : null;
  const password = req.body ? req.body.password : null;
  const role = req.body ? req.body.role: null;
  //const description = req.body && req.body.profile ? req.body.profile: null;
  //const languages = req.body && req.body.profile ? req.body.profile.languages: null;
  //const sideProjects = req.body && req.body.profile ? req.body.profile.sideProjects: null;
  
  const confirmed = false;
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Missing password' });
    return;
  }
  if (!role) {
    return res.status(400).json({ error: 'Missing role' });
  }
  /*
  if (req.employer.role !== 'Employer' || req.jobSeeker.role !== 'Job Seeker') {
    return res.status(400).json({ error: 'Missing Appropriate Role Description'});
  }
  */
  /*
  if (!description) {
    return res.status(400).json({ error: 'Missing description' });
  }
  if (!languages) {
    return res.status(400).json({ error: 'Missing languages' });
  }
  if (!sideProjects) {
    return res.status(400).json({ erro: 'Missing side projects' });
  }
  */
  const passwordHashed = sha1(password);
  const userObject = {
    username,
    email,
    password: passwordHashed,
    role,
    verified: false,
  }
  mongo.db.collection('users').findOne({ email })
    .then((value) => {
      if (value) {
        res.status(400).json({ error: 'Already exist' });
	throw new Error('ResponseSent');
      }
      //const emailPasswordObject = { email, password: passwordHashed };
      return mongo.db.collection('users').insertOne(userObject);
    })
    .then(async (insertedData) => {
      if (insertedData.insertedCount > 0) {
	/*
	 * Email must be sent here i will work on it
	 * sendQueue.add({name: userObject.name, email: userobject.email});
	 */
	sendQueue.add({name: userObject.name, email: userobject.email});
	const randomToken = uuid.v4().toString();
        const keyVerification = `verify_${randomToken}`;
	const duration = 24 * 60 * 60;
	return redis.set(keyVerification, insertedData.insertedId.toString(), duration)
	  .then((result) => {
	    if (result) {
	      sendQueue.add({name: userObject.username, email: userObject.email, token: randomToken});
	      const id = insertedData.insertedId;
	      return res.status(201).json({ id, email });
	    }
	  })
          .catch((redisError) => {
	    res.status(500).json({ error: 'Registration Successful But failed to create Verification token'})
	    throw new Error('ResponseSent')
	  });
      } else {
        return res.status(400).json({ error: 'No data inserted, check input data' });
      }
    })
    .catch((error) => {
      if (error.message === 'ResponseSent') {
        return;
      }
      return res.status(400).json({ error: `Internal Server Error error ${error}` });
    });
};

exports.getMe = (req, res) => {
  const xToken = req.headers['x-token'];
  if (!xToken) {
    return res.status(401).json({ error: 'Unauthorized/token' });
  }
  const key = `auth_${xToken}`;
  redis.get(key)
    .then((userID) => {
      if (!userID) {
        return res.status(401).json({ error: 'Unauthorized/userId not retrieved' });
      }
      return mongo.db.collection('users').findOne({ _id: ObjectId(userID) });
    })
    .then((data) => {
      if (!data) {
        return res.status(401).json({ error: 'Unauthorized/No user with that ID found from mongodb' });
      }
      return res.status(200).json({ id: data._id, email: data.email, role: data.role });
    })
    .catch(() => res.status(401).json({ error: 'Unauthorized/Error Catch section' }));
};
exports.verify = async (req, res) => {
  const verificationToken = req.query? req.query.token: null;
  if (!verificationToken) {
    return res.status(400).json({error: 'Unverified Token'});
  }
  const identificationToken = `verify_${verificationToken}`;
  try {
    console.log(identificationToken);
    const userId = await redis.get(identificationToken);
    console.log(userId);
    if (!userId) {
      return res.status(401).json('Unauthorized/no Token found for that input');
    }
    if (userId) {
      const user = await mongo.db.collection('users').findOne({_id: ObjectId(userId)});
      if (!user) {
        return res.status(404).json({error: 'User Not found'});
      } else {
        if (user.verified) {
          return res.status(200).json({message: 'User already Verified' });
        }
        const verificationUpdate = await mongo.db.collection('users').updateOne({_id: ObjectId(userId)}, {$set: {verified: true}})
        if (verificationUpdate.modifiedCount === 1) {
	  await redis.del(identificationToken);
          return res.status(200).json({ message: 'User Email Verified Successfully' });
        } else {
          return res.status(400).json({message: 'Email Verification failed' });	
        }
      }
  
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error/catch section' });
  }
}
