const mongo = require('mongodb');
require('dotenv').config();
class DBClient {
  constructor() {
    const port = process.env.DB_PORT || '27017';
    const host = process.env.DB_HOST || 'localhost';
    const db = process.env.DB_DATABASE || 'files_manager';
    const dbUrl = process.env.URLDB;
    const url = dbUrl || `mongodb://${host}:${port}`;
    this.mongoClient = new mongo.MongoClient(url, { useUnifiedTopology: true });
    this.mongoClient.connect()
      .then(() => {
        this.db = this.mongoClient.db(db);
      });
  }

  isAlive() {
    if (this.mongoClient.isConnected()) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    const usersCount = await this.db.collection('users').countDocuments();
    return usersCount;
  }

  async nbFiles() {
    const filesCount = await this.db.collection('files').countDocuments();
    return filesCount;
  }
}
const dbClient = new DBClient();
module.exports = dbClient;
