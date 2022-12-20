const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

require('dotenv').config();

const { getClassesForStudent } = require('../db/queries/classStudentQueries');
const { updateStudent, generateUniqueCode, getStudentByEmail, getStudentByCode, addStudent, getStudentById } = require('../db/queries/studentQueries');
const { getClassList, unpackageClassObjects } = require('../helpers/classHelpers');
const { formatDate, formatTime, updateHistory, sortClasses } = require('../helpers/operationHelpers');

// Render the user's account page if they are logged in
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = await getStudentById(req.session.user.student_id);

      const classIds = await getClassesForStudent(req.session.user.student_id); // Get all class ids
      const classesInc = await getClassList(classIds); // Get all class objects
      const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects
      const classListCom = await sortClasses(classesCom);
      console.log(classListCom);

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', { user: req.session.user, formatDate, formatTime, classes: classesCom.sort(c => c.start_datetime), message: undefined });
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to access your account page." });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the login page if the user is not logged in
router.get('/login', async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: undefined });
    } else {
      res.redirect('/');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Send an email to user with their unique login code
router.post('/login/email', async (req, res) => {
  try {
    const student = await getStudentByEmail(req.body.email);
    if (student) {
      const unique_code = generateUniqueCode();
      await updateStudent(student.student_id, { unique_code });

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO ?? student.email,
        subject: process.env.COMPANY + ' Login Code',
        text: `Here is your unique code to login: ${unique_code}`,
      });

      res.render('../../client/views/pages/account_code_login', { user: req.session.user });
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "There is no account with this email."});
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create cookie session if the user is not logged in
router.post('/login', async (req, res) => {
  try {
    const student = await getStudentByCode(req.body.code);
    if (student) {
      req.session.user = student;

      const classIds = await getClassesForStudent(req.session.user.student_id); // Get all class ids
      const classesInc = await getClassList(classIds); // Get all class objects
      const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects
      const classListCom = await sortClasses(classesCom);
      console.log(classListCom);

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', { user: req.session.user, formatDate, formatTime, classes: classesCom.sort(c => c.start_datetime), message: "Successfully logged in." });
    } else {
      res.redirect('/');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Destroy session cookie to log user out
router.get('/logout', async (req, res) => {
  try {
    if (req.session.user) {
      req.session = null;
    }
    res.redirect('/');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the account registration page if the user is not logged in
router.get('/register', async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.history = updateHistory(req.session.history, 'account/register');
      res.render('../../client/views/pages/account_register', { user: req.session.user });
    } else {
      res.redirect('/');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new user into the database
router.post('/register', async (req, res) => {
  try {
    const student = await addStudent(req.body.first_name, req.body.last_name, req.body.email);
    if (student) {
      req.session.user = student;

      const classIds = await getClassesForStudent(req.session.user.student_id); // Get all class ids
      const classesInc = await getClassList(classIds); // Get all class objects
      const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects
      const classListCom = await sortClasses(classesCom);

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', { user: req.session.user, formatDate, formatTime, classes: classesCom.sort(c => c.start_datetime), message: "Successfully created your account." });
    } else {
      res.render('../../client/views/pages/error', { message: "There was an error creating your account.", user: req.session.user });
    }
    
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;