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

class JobSeeker {
  static async createProfile(req, res) {
    const userId = req.jobSeeker._id;
    const name = req.body ? req.body.name: null; 
    const jobSeekerLocation = req.body ? req.body.jobSeekerLocation: null;
    const telegram = req.body ? req.body.telegram: null;
    const github = req.body ? req.body.github: null;
    const linkedin = req.body ? req.body.linkedin: null;
    const skills = req.body ? req.body.skills: null;
    const languages = req.body ? req.body.languages: null;
    const professionalSummary = req.body ? req.body.professionalSummary: null;
    const portFolioLink = req.body ? req.body.portFolioLink: null;
    const education = req.body ? req.body.education: null;
    console.log('I am being retreived'); 
    if (!name || !jobSeekerLocation || !telegram || !github || !linkedin || !skills || !languages || !languages || !professionalSummary || !portFolioLink || !education) {
      return res.status(400).json({error: 'Missing Fields' });
    }
    const createObject = {
      name,
      jobSeekerLocation,
      telegram,
      github,
      linkedin,
      skills,
      languages,
      professionalSummary,
      portFolioLink,
      education,
    }
    try {
      const insertedData = await dbClient.db.collection('JobSeeker').insertOne(createObject);
      if (insertedData) {
        return res.status(201).json({
          message: "Profile created Successfully",
          jobSeekerId: insertedData.insertedId,
          telegram,
          github,
          linkedin,
          skills,
          languages,
          professionalSummary,
	  portFolioLink,
	  education,
	});
      } else {
        return res.status(500).json({ message: 'Failed to create Your profile' });
      }
    } catch(error) {
      return res.status(500).json({ message: 'Failed to create Your profile' });
    };
  };
  static async updateProfile(req, res) {
    const id = req.params.id ? req.params.id: null;
    if (!id) {
      return res.status(400).json({ error: 'Missing Id parameter' });
    }
    /*
    if (!Object.isValid(id)) {
      return res.status(400).json({ error: 'Invalid Id format' });
    }
    */
    const updateObject = { ...req.body };
    console.log(updateObject);
    console.log(id);
    try {
      const updatedData = await dbClient.db.collection('JobSeeker').updateOne({ _id: ObjectId(id)}, {$set: updateObject});
      if (updatedData.modifiedCount > 0) {
        return res.status(200).json({
          message: "Employer updated Successfully",
          updateObject,
	})
      } else {
        return res.status(304).json({});
      }
    } catch(error) {
      return res.status(500).json({ error: `Failed to update jobseeker ${error}`});
    }
  }
  static async deleteProfile(req, res) {
    const id = req.params.id ? req.params.id: null;
    if (!id) {
      return res.status(400).json({ error: 'Missing Id parameter' });
    }
    /*
    if (!Object.isValid(id)) {
      return res.status(400).json({error: 'Invalid Id format '});
    }
    */
    console.log(id);
    try {
      const deletedData = await dbClient.db.collection('JobSeeker').deleteOne({_id: ObjectId(id)});
      if (deletedData.deletedCount) {
        return res.status(200).json({message: 'Deleted Sucessfully '});
      } else {
	return res.status(404).json({ error: 'No job found with this Id' });
      }
    } catch(error) {
	return res.status(500).json({ error: 'Failed to Delete' });
    }
  }
  /*
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
  static async getLinkDownloadCv(req, res) {
    try {
      const jobSeekerId = req.params ? req.params.id: null;
      if (!jobSeekerId) {
        return res.status(400).json({ error: 'Job Seeker not provided' });
      }
      const jobSeeker = await dbClient.db.collection('JobSeekers').findOne({ _id: ObjectId(jobSeekerId) });
      if (!jobSeeker) {
        return res.status(404).json({ error: 'Job Seeker Id not found' });
      } else {
        const filePath = jobSeeker.cvFilePath;
	const url = await JobSeeker.getSignedUrl(filePath);
	return res.status(200).json({ downloadUrl: url });
      }
    } catch(error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  */
  static async uploadCv(req, res) {
    try {
      const file = req.file ? req.file: null;
      const jobId = req.params ? req.params.jobId: null;
      const jobSeekerId = req.jobSeeker ? req.jobSeeker._id: null;
      if (!jobSeekerId) {
        return res.status(400).json({ error: 'No ID provided' });
      }
      if (!file) {
        return res.status(400).json({error: 'No file Uploaded'});
      }
      const verifyJobID = await dbClient.db.collection('jobs').findOne({_id: ObjectId(jobId)});
	
      if (!verifyJobID) {
        return res.status(400).json({error: 'No Job with that Id found' });
	//throw new Error('ResponseSent');
      } 
      /* creating a file name what will  be used to access in the firebaseStorage */
      const fileName = `cvs/${jobSeekerId}-${Date.now()}-${file.originalname}`;
     /* creating a reference i think it is kind of a placeholder like variable this is where to upload the file too */
      const fileUpload = bucket.file(fileName)

    /* giving an information of the type of file which is very important for processing or may be displaying */
      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });
     /* I am creating event listener to catch errors */
      blobStream.on('error', (error) => {
        return res.status(500).json({error: 'Unable to upload image at this time'});
      })
      /* creating event listener here that will executed when the files is uploaded to the stream and make it public */
      blobStream.on('finish', async() => {
       /*
       await fileUpload.makePublic();
       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
       await JobSeeker.update(jobSeekerId, {cvUrl: publicUrl });
       res.status(200).json({message: 'CV uploaded successfully', url: PublicUrl });
       */
      try {
        const applicationObject = {
          jobId: ObjectId(jobId),
          jobSeekerId: ObjectId(jobSeekerId),
          cvFilePath: fileName,
        }
	const application = await dbClient.db.collection('applications').insertOne(applicationObject);
	if (!application) {
          return res.status(400).json({ error: 'Error creating application' });
        } else {
          return res.status(201).json({ message: 'CV uploaded and application created successfully', applicationId: application.insertedId });
        }
      } catch (error) {
	return res.status(500).json({ error: 'An error occured when uploading' });
      }
      });
      /* Here I am passing the data is stored in the buffer because am using multer to store on memory*/
      blobStream.end(file.buffer)
    } catch (error) {
	/*
        if (error.message === 'ResponseSent') {
	  console.log(`I am the error ${error?.message}`)
	  return;
        } else {
          return res.status(500).json({ error: 'An error occured when uploading CV' });
        }
	*/
	return res.status(500).json({ error: 'An error occured when uploading CV' });
    }
  };
  static async getJobs(req, res) {
    try {
      const page = Number(req.query.page) || 0;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const totalJobs = await dbClient.db.collection('jobs').countDocuments();
      const totalPages = Math.ceil(totalJobs / limit);
      const jobs = await dbClient.db.collection('jobs')
        .find({})
        /*.sort({ createdAt: -1})*/
        .skip(skip)
        .limit(limit)
        .toArray();
      return res.status(200).json(jobs, totalJobs, totalPages, page);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
module.exports = JobSeeker;
