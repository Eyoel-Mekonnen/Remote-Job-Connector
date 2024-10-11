const express = require('express');

const router = express.Router();

const AppController = require('../controllers/AppController');

const UsersController = require('../controllers/UsersController');

const AuthController = require('../controllers/AuthController');

const FilesController = require('../controllers/FilesController');

const Authenenticate = require('../middlewares/Authenticate');

const EmployerMiddleWare = require('../middlewares/EmployerMiddleWare');

const Employer = require('../controllers/Employer');

const JobSeekerMiddleWare = require('../middlewares/JobSeekerMiddleWare');

const JobSeeker = require('../controllers/JobSeeker');

const upload = require('../middlewares/upload');

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/signup', UsersController.postNew);
router.get('/signin', AuthController.getConnect);
router.get('/signout', AuthController.getDisconnect);
router.get('/verify', UsersController.verify);

/* Employers Only */
router.post('/jobs', EmployerMiddleWare.getEmployer, Employer.create);
router.put('/jobs/:jobId', EmployerMiddleWare.getEmployer, Employer.update);
router.delete('/jobs/:jobId', EmployerMiddleWare.getEmployer, Employer.deleteJob);
/* Here what happens for a specific Job that was posted employer will retrieve the applications */
router.get('/jobs/:jobId/applications', EmployerMiddleWare.getEmployer, Employer.jobApplications); 
/* Here first for a specific Job that was posted employer will download a specific resume */
router.get('/jobs/:jobId/applications/:applicationId/download-cv', EmployerMiddleWare.getEmployer, Employer.getLinkDownloadCv);

/**Job Seekers Only */
router.post('/jobseekers/:jobId/apply', JobSeekerMiddleWare.getJobSeeker, upload.single('file'), JobSeeker.uploadCv);
router.get('/jobs', JobSeekerMiddleWare.getJobSeeker, JobSeeker.getJobs);
router.post('/profile/', JobSeekerMiddleWare.getJobSeeker, JobSeeker.createProfile);
router.put('/profile/:id', JobSeekerMiddleWare.getJobSeeker, JobSeeker.updateProfile);
router.delete('/profile/:id', JobSeekerMiddleWare.getJobSeeker, JobSeeker.deleteProfile);

router.get('/users/me', UsersController.getMe);
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFile);
module.exports = router;
