const mongo = require('../utils/db');

const redis = require('../utils/redis');

const { ObjectId } = require('mongodb');

class EmployerMiddleWare {
  static async getEmployer(req, res, next) {
    const xToken = req.headers['x-token'];
    if (!xToken) {
      return res.status(401).json({ error: 'Unauthorized/Token not found from redis' });
    }
    const key = `auth_${xToken}`;
    redis.get(key)
      .then((userID) => {
        if (!userID) {
          res.status(401).json({ error: 'Unauthorized/userId not found from the redis' });
          throw new Error('Response message');
        }
        return mongo.db.collection('users').findOne({ _id: ObjectId(userID) });
      })
      .then((data) => {
        if (data) {
          //return res.status(200).json({ id: data._id, email: data.email });
          if (data.role === 'Employer') {
	    req.employer = data;
            next()
          } else {
            res.status(403).json({ error: 'Access Denied/Not Employer' });
	    throw new Error("Response message");
          }
        } else if (!data) {
          res.status(404).json({ error: 'User not found/not found from the mongodb' });
          throw new Error("Response message");
	}
      })
      .catch((error) => {
        if (error === 'Response message') {
          return;
        }
      })
  };
};
module.exports = EmployerMiddleWare;
