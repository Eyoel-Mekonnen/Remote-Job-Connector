const redisClient = require('./utils/redis');

const dbClient = require('./utils/db');

const Queue = require('bull');

const queue = new Queue('fileQueue');

const sendQueue = new Queue('sendEmail');

const { ObjectId } = require('mongodb');

const fs = require('fs');

const imageThumbnail = require('image-thumbnail');

const nodemailer = require('nodemailer');

require('dotenv').config();

console.log('Worker Listening');
sendQueue.process(async (job, done) => {
  if (!job.data.email) {
    return done (new Error('Error Retreiving email' ));
  }
  if (!job.data.name) {
    return done (new Error('Error Retreiving name' ));
  }
  if (!job.data.token) {
    return done (new Error('Error Retreiving Token'));
  }
  const email = job.data.email;
  const name = job.data.name;
  const token = job.data.token;
  const output = await dbClient.db.collection('users').findOne({ email });
  if (output && output !== null) {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      }
    });
    const verificationLink = `https://remote-job-connector.vercel.app/verify?token=${token}`;
    const info = await transporter.sendMail({
      from: "eyoelakatommyshellby@gmail.com",
      to: `${email}`,
      subject: 'Welcome to Remote Jobs',
      text: `Welcome To Remote-job-connector Its time to get you hired!!! \n Verification Link ${verificationLink}`,
    });
    done();
  } else {
    return done (new Error('User with that email not found'));
  }
});

queue.process(async (job, done) => {
  console.log('Am inside here');
  if (!job.data.fileId) {
    done (new Error('userID is not valid ObjectID'));
  }
  if (!job.data.userId) {
    done (new Error('userID is not valid ObjectID'));
  }
  let _id;
  let userId;
  try {
    _id = ObjectId(job.data.fileId);
  } catch {
    done(new Error('Error converting fileID to ObjectId' ));
  }
  try {
    userId = ObjectId(job.data.userId);
  } catch {
    done (new Error('Error converting fileID to ObjectId' ));
  }
  console.log('The _id and userId passed');
  console.log(_id);
  console.log(userId);
  const output = await dbClient.db.collection('files').findOne({ _id, userId });
  console.log(output);
  if (output) {
    const filePath = output.localPath;
    const widths = [500, 250, 100];
    console.log('I am inside here output');
    for (let i = 0; i < widths.length; i++) {
      console.log('I am inside the loop');
      const thumbnail = await imageThumbnail(filePath, { width: widths[i], responseType: 'buffer' });
      const filePathThumbnail = `${filePath}_${widths[i]}`;
      await fs.promises.writeFile(filePathThumbnail, thumbnail)
      console.log(`I am stroed as ${filePathThumbnail}`);
    }
    done();
  } else {
    done (new Error('No file found in the database'));
  }
})
