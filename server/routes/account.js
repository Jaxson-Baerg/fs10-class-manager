const express = require('express');
const router = express.Router();

require('dotenv').config();

const { updateStudent, generateUniqueCode, getStudentByEmail, getStudentByCode, addStudent, getStudentById } = require('../db/queries/studentQueries');
const { updateHistory, sendEmail } = require('../helpers/operationHelpers');
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
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
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
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
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

      // Send unique login code to user's email
      await sendEmail(
        'email_code.html',
        process.env.EMAIL_TO ?? student.email,
        'Login Code',
        {
          code: unique_code
        }
      );

      res.render('../../client/views/pages/account_code_login', { user: req.session.user, email: student.email, message: undefined });
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "There is no account with this email."});
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
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
      res.render('../../client/views/pages/account_code_login', { user: req.session.user, email: req.body.email, message: "Incorrect code." });
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
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
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
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
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Register a new user into the database
router.post('/register', async (req, res) => {
  try {
    const studentObj = await getStudentByEmail(req.body.email);
    if (!studentObj) {
      const student = await addStudent(req.body.first_name, req.body.last_name, req.body.email, req.body.mailing_list ? true : false);
      if (student) {
        req.session.user = student;

        if (req.session.user.mailing_list) {
          req.session.user = await updateStudent(req.session.user.student_id, {
            credits: req.session.user.credits + 1
          });
          // TODO mailchimp logic
          console.log(`add mailchimp setup here for ${req.session.user.first_name} ${req.session.user.last_name}.`);
        }

        // send account register email to user and admin
        await sendEmail(
          'email_account_register.html',
          process.env.EMAIL_TO ?? student.email,
          'Account Register',
          {
            name: `${req.session.user.first_name} ${req.session.user.last_name}`,
            host_url: process.env.HOST_URL
          }
        );

        await sendEmail(
          'email_admin_account_register.html',
          process.env.EMAIL_TO ?? process.env.EMAIL_FROM,
          'Account Registered',
          {
            name: `${req.session.user.first_name} ${req.session.user.last_name}`,
            email: req.session.user.email
          }
        );

        const data = await getAccountPageData(req.session.user, "Successfully created your account.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      } else {
        res.render('../../client/views/pages/error', { message: "There was an error creating your account.", user: req.session.user });
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "That email is already registered, please login." });
    }

    
    
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;