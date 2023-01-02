const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const router = express.Router();

require('dotenv').config();

const { updateStudent, generateUniqueCode, getStudentByEmail, getStudentByCode, addStudent, getStudentById } = require('../db/queries/studentQueries');
const { updateHistory } = require('../helpers/operationHelpers');
const { getAccountPageData } = require('../helpers/renderHelpers');

// Render the user's account page if they are logged in
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = await getStudentById(req.session.user.student_id);
      
      const data = await getAccountPageData(req.session.user);

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
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

      // Compile HTML for email styling and variable passing
      const filePath = path.join(__dirname, '../views/email_code.html');
      const source = fs.readFileSync(filePath, 'utf-8').toString();
      const template = handlebars.compile(source);
      const replacements = {
        code: unique_code
      };
      const htmlToSend = template(replacements);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO ?? student.email,
        subject: process.env.COMPANY + ' Login Code',
        html: htmlToSend
      });

      res.render('../../client/views/pages/account_code_login', { user: req.session.user, student, message: undefined });
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

      const data = await getAccountPageData(req.session.user, "Successfully logged in.");

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
    } else {
      res.render('../../client/views/pages/account_code_login', { user: req.session.user, student, message: "Incorrect code." });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Destroy session cookie to log user out
router.get('/logout', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = null;
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
    const student = await addStudent(req.body.first_name, req.body.last_name, req.body.email, req.body.mailing_list ? true : false);
    if (student) {
      req.session.user = student;

      if (req.session.user.mailing_list) {
        req.session.user = await updateStudent(req.session.user.student_id, {
          credits: req.session.user.credits + 1
        });
        // TODO mailchimp logic
        console.log('add mailchimp setup here.');
      }

      // TODO send account register email
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Compile HTML for email styling and variable passing
      const filePath = path.join(__dirname, '../views/email_account_register.html');
      const source = fs.readFileSync(filePath, 'utf-8').toString();
      const template = handlebars.compile(source);
      const replacements = {
        name: req.session.user.first_name,
        host_url: process.env.HOST_URL
      };
      const htmlToSend = template(replacements);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO ?? student.email,
        subject: process.env.COMPANY + ' Account Register',
        html: htmlToSend
      });

      const data = await getAccountPageData(req.session.user, "Successfully created your account.");

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
    } else {
      res.render('../../client/views/pages/error', { message: "There was an error creating your account.", user: req.session.user });
    }
    
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;