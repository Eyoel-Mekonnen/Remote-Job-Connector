const mongo = require('../utils/db');
const redis = require('../utils/redis')

class Authenticate {
  static async getMe(req, res, next) {
    const xToken = req.headers['x-token'];
    if (!xToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${xToken}`;
    redis.get(key)
      .then((userID) => {
        if (!userID) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        return mongo.db.collection('users').findOne({ _id: ObjectId(userID) });
      })
      .then((data) => {
        if (data) {
          //return res.status(200).json({ id: data._id, email: data.email });
	  next();
        }
      })
      .catch(() => res.status(401).json({ error: 'Unauthorized' }));
  };
};
module.exports = Authenticate;
