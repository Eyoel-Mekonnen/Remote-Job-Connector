const mongo = require('../utils/db');

const redis = require('../utils/redis');

const { ObjectId } = require('mongodb');

class JobSeekerMiddleWare {
  static async getJobSeeker(req, res, next) {
    const xToken = req.headers['x-token'];
    if (!xToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    redis.get(key)
      .then((userID) => {
        if (!userID) {
          res.status(401).json({ error: 'Unauthorized' });
          throw new Error('Response message');
        }
        return mongo.db.collection('users').findOne({ _id: ObjectId(userID) });
      })
      .then((data) => {
        if (data) {
          //return res.status(200).json({ id: data._id, email: data.email });
          if (data.role === 'Job Seeker') {
	    req.jobSeeker = data;
            next();
          } else {
            res.status(403).json({ error: 'Access Denied' });
	    throw new Error('Response message');
          }
        } else if (!data) {
          res.status(404).json({ error: 'User not found' });
          throw new Error('Response message');
        }
      })
      .catch((error) => {
	if (error === 'Response message') {
          return;
	} else {
          return res.status(500).json({ error: 'Internal Server Error' });
        }
      });
  };
}
module.exports = JobSeekerMiddleWare;                                  
