/* eslint consistent-return: "off" */

//import sha1 from 'sha1';

const sha1 = require('sha1');

const uuid = require('uuid');

const mongo = require('../utils/db');

const redis = require('../utils/redis');

exports.getConnect = (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).send({ error: 'Unauthorized/no authorization header provided' });
  }
  const authCredentials = authorization.split(' ');
  const authType = authCredentials[0];
  if (authType !== 'Basic') {
    return res.status(401).send({ error: 'Unauthorized/authorization not basic' });
  }
  const base64Encoded = authCredentials[1];
  const decodedByte = Buffer.from(base64Encoded, 'base64');
  const stringDecoded = decodedByte.toString('utf-8');
  const email = stringDecoded.split(':')[0];
  const password = stringDecoded.split(':')[1];
  mongo.db.collection('users').findOne({ email })
    .then((result) => {
      if (!result) {
        return res.status(401).json({ error: 'Unauthorized/the email does not exist' });
      }
      const token = uuid.v4().toString();
      const keyToken = `auth_${token}`;
      const duration = 24 * 60 * 60;
      const pwdHashedDB = result.password;
      const hashedPwd = sha1(password);
      if (hashedPwd !== pwdHashedDB) {
        return res.status(401).json({ error: 'Unauthorized/the stored hashed password and the input password hashed is not the same' });
      }
      const userID = result._id.toString();
      return redis.set(keyToken, userID, duration)
        .then((result) => {
          if (result) {
            return redis.get(keyToken)
              .then((value) => {
                if (value) {
                  return token;
                } else { 
                  return res.status(401).json({ error: 'Unauthorized/token was not found on redis' });
	        }
              })
              //.catch(() => res.status(401).json({ error: 'Unauthorized/error retrieving token' }));
          } else {
            return res.status(401).json({ error: 'Unauthorized/there was an error retreiving the token'});
          }
        })
        //.catch(() => res.status(401).json({ error: 'Unauthorized/Overall error in retriving token'}));
    })
    .then((token) => {
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized/token does not exist' });
      } 
      return res.status(200).json({ token });
    })
    .catch((error) => {
       if (!res.headersSent) {
         res.status(401).json({ error: error.message, message: 'error in the catch section' });
       }
    });
};

exports.getDisconnect = (req, res) => {
  const xToken = req.headers['x-token'];
  if (!xToken) {
    return res.status(401).json({ error: 'Unauthorized/header does not contain token' });
  }
  const key = `auth_${xToken}`;
  return redis.get(key)
    .then((value) => {
      if (!value) {
        throw new Error('Unauthorized');
      }
      return redis.del(key);
    })
    .then(() => (res.status(204).json()))
    .catch(() => (res.status(401).json({ error: 'Unauthorized/token does not exist in redisdb' })));
};
