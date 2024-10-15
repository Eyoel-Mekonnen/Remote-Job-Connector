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

const { admin, bucket } = require('../firebaseConfig');

class Employer {
  static async create(req, res) {
    const employerId = req.employer._id
    const title = req.body ? req.body.title: null;
    const description = req.body ? req.body.description: null;
    const createdAt = req.body ? req.body.date: null;
    if (!title || !description ||!createdAt) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const createObject = {
      title,
      description,
      employerId,
      createdAt,
    }
    try {
      const insertedData = await dbClient.db.collection('jobs').insertOne(createObject);
      if (insertedData.insertedCount) {
        return res.status(201).json({
          message: "Job created successfully",
          jobId: insertedData.insertedId,
          title,
          description,
          employerId,
          createdAt,
        })
      } else {
        return res.status(500).json({ message: 'Failed to create/Fields to be created' });
      } 
    } catch (error) {
      return res.status(500).json({ message: 'Failed to create/catch section' });
    }
  }
  static async update(req, res) {
    const id = req.params.jobId ? req.params.jobId: null;
    if (!id) {
      return res.status(400).json({ error: 'Missing Id parameter' });
    }
    /*
    if (!Object.isValid(id)) {
      return res.status(400).json({error: 'Invalid ID format' });
    }
    */
    const updateObject = { ...req.body };

    try {
      console.log(updateObject);
      console.log(id);
      const updatedData = await dbClient.db.collection('jobs').updateOne({_id: ObjectId(id)}, {$set: updateObject});
      if (updatedData.modifiedCount) {
         return res.status(200).json({
           message: "Employer updated Successfully",
           updateObject
         })
      } else {
        return res.status(304).send("Not found");
      }
   
    } catch (error) {
      return res.status(500).json({ error: `Failed to update employer ${error}` });
    }
  }
  static async deleteJob (req, res) {
    const id = req.params.jobId ? req.params.jobId: null;
    if (!id) {
      return res.status(400).json({ error: 'Missing Id parameter' });
    }
    /*
    if (!Object.isValid(id)) {
      return res.status(400).json({error: 'Invalid ID format' });
    }
    */
    try {
      console.log(id);
      const deletedData = await dbClient.db.collection('jobs').deleteOne({_id: ObjectId(id)});
      if (deletedData.deletedCount) {
        return res.status(200).json({message: 'Deleted Successfully'});
      } else {
        return res.status(404).json({error: 'No job found with this Id' });
      }
    } catch(error) {
      return res.status(500).json({error: 'Failled to Delete' });
    }
  }
  static async getSignedUrl(filePath) {
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    };
    try {
      const file = bucket.file(filePath)
      const urls = await file.getSignedUrl(options);
      const url = urls[0];
      return url;
    } catch (error) {
      console.error('Error generating signed URL', error);
      throw error;
    }
  }
  static async jobApplications(req, res) {
    try {
      const jobId = req.params ? req.params.jobId: null;
      const employerId = req.employer._id;
      /* Verifying that this employer exists for this jobId */
      const job = await dbClient.db.collection('jobs').findOne({ _id: ObjectId(jobId), employerId: ObjectId(employerId) });
      if (!job) {
        return res.status(403).json({ error: 'Access Denied' });
      }
      const applications = await dbClient.db.collection('applications').find({jobId: ObjectId(jobId) }).toArray();
      return res.status(200).json({ applications })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve applications '});
    }
  }
  static async getLinkDownloadCv(req, res) {
    try {
      const jobId = req.params ? req.params.jobId: null;
      const applicationId = req.params ? req.params.applicationId: null;
      const employerId = req.employer._id;
      /* Verify that this employer has authority over this application so that he can download the file */
      const job = await dbClient.db.collection('jobs').findOne({ _id: ObjectId(jobId), employerId: ObjectId(employerId) });
      if (!job) {
        return res.status(403).json({ error: 'Access Denied/Job was not fetched from findOne' });
      }
      const application = await dbClient.db.collection('applications').findOne({ jobId: ObjectId(jobId), _id: ObjectId(applicationId) });
      if (!application) {
        return res.status(403).json({ error: 'Access Denied' });
      }
      const filePath = application.cvFilePath;
      const url = await Employer.getSignedUrl(filePath);
      console.log(filePath);
      return res.status(200).json({ downloadedUrl: url });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve applications/catch section' });
    }
  }
  static async getCreatedJobs(req, res) {
    try {
      const employerId = req.employer._id;
      const createdJobs = await dbClient.db.collection('jobs').find({employerId: ObjectId(employerId)}).toArray();
      /** title, id, count **/
      if (createdJobs.length === 0) {
        return res.status(404).json({error: 'No jobs created by this id'});
      } else {
       const response = createdJobs.map(job => {
         return { id: job._id, title: job.title }; // Assuming you only want to return the ID and title
       }); 
        return res.status(200).json(response);
      }
    } catch (error) {
      return res.status(500).json({error: 'Internal Server error'});
    }
  }
}
module.exports = Employer;
