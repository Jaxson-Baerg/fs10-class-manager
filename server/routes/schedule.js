const express = require('express');
const router = express.Router();
const chalk = require('chalk');

require('dotenv').config();

const { updateStudent, getStudentById } = require('../db/queries/studentQueries');
const { getClassesByClassType, getClassById } = require('../db/queries/classQueries');
const { registerStudent, cancelRegistration, getClassesForStudent, getCompletedClasses } = require('../db/queries/classStudentQueries');
const { getSpotsRemaining, unpackageClassObjects } = require('../helpers/classStudentHelpers');
const { formatDate, formatTime, updateHistory, sortClasses, sendEmail } = require('../helpers/operationHelpers');
const { getClassTypeById } = require('../db/queries/classTypeQueries');
const { getAccountPageData, getPurchasePageData } = require('../helpers/renderHelpers');

// Render the schedule page for a given class type
router.get('/class/:class_type_id/', async (req, res) => {
  try {
    const classType = await getClassTypeById(req.params.class_type_id);
    let classList = await getClassesByClassType(req.params.class_type_id, req.session.user ? req.session.user.student_id : undefined);
    
    req.session.history = updateHistory(req.session.history, `schedule/${req.params.class_type_id}`);
    res.render('../../client/views/pages/schedule', { user: req.session.user, classList: classList, formatDate, formatTime, confirm: undefined, classType });
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/register/confirm', async (req, res) => {
  try {
    res.redirect('/');
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Render the confirmation page to allow the user a second chance
router.post('/register/confirm', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = await getStudentById(req.session.user.student_id);

      const studentClasses = await getClassesForStudent(req.session.user.student_id);
      if (studentClasses.filter(e => e.class_id === req.body.class_id).length < 1) {
        if (req.body.spots_remaining > 0) {
          if (req.session.user.credits >= req.body.credits) {
            res.render('../../client/views/pages/class_register', { user: req.session.user, class_type_id: req.body.class_type_id, class_id: req.body.class_id, credits: req.body.credits });
          } else {
            const data = await getPurchasePageData(req.session.user, `You do not have enough credits to register for this class. You need ${req.body.credits - req.session.user.credits} more to register.`);

            req.session.history = updateHistory(req.session.history, 'purchase/');
            res.render('../../client/views/pages/purchase', data);
          }
        } else {
          res.redirect('/');
        }
      } else {
        res.redirect('/');
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/register', async (req, res) => {
  try {
    if (req.session.user) {
      res.redirect('/account');
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Process class registration and redirect to account page
router.post('/register', async (req, res) => {
  try {
    if (req.session.user) {
      const studentClasses = await getClassesForStudent(req.session.user.student_id);

      if (studentClasses.filter(c => c.class_id == req.body.class_id).length < 1) {
        await registerStudent(req.body.class_id, req.session.user.student_id);
        await updateStudent(req.session.user.student_id, { credits: req.session.user.credits - req.body.credits });
        req.session.user = await getStudentById(req.session.user.student_id);

        const classObjInc = await getClassById(req.body.class_id);
        const classList = await unpackageClassObjects([classObjInc]);

        // send user email
        await sendEmail(
          'email_class_register.html',
          process.env.EMAIL_TO ?? req.session.user.email,
          'Class Confirmation',
          {
            class_type: classList[0].name,
            day: formatDate(classList[0].start_datetime),
            time: formatTime(classList[0].start_datetime, true)
          }
        );

        // send admin email
        await sendEmail(
          'email_admin_class_register.html',
          process.env.EMAIL_TO ?? process.env.EMAIL_FROM,
          'Class Registration',
          {
            name: `${req.session.user.first_name} ${req.session.user.last_name}`,
            email: req.session.user.email,
            class_type: classList[0].name,
            day: formatDate(classList[0].start_datetime),
            time: formatTime(classList[0].start_datetime, true)
          }
        );

        const data = await getAccountPageData(req.session.user, "Successfully registered.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      } else {
        const data = await getAccountPageData(req.session.user, "Already registered!");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/cancel/confirm', async (req, res) => {
  try {
    if (req.session.user) {
      res.redirect('/account');
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Render the confirmation page to give the user a second chance
router.post('/cancel/confirm', async (req, res) => {
  try {
    if (req.session.user) {
      res.render('../../client/views/pages/class_cancel' , { user: req.session.user, class_id: req.body.class_id, credits: req.body.credits});
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/cancel', async (req, res) => {
  try {
    if (req.session.user) {
      res.redirect('/account');
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Cancel a user's class registration and refund their credits
router.post('/cancel', async (req, res) => {
  try {
    if (req.session.user) {
      const classes = await getClassesForStudent(req.session.user.student_id);
      if (classes.filter(c => c.class_id == req.body.class_id).length > 0) {
        await cancelRegistration(req.body.class_id, req.session.user.student_id);
        await updateStudent(req.session.user.student_id, { credits: Number(req.session.user.credits) +    Number(req.body.credits) });
        req.session.user = await getStudentById(req.session.user.student_id);

        const classObjInc = await getClassById(req.body.class_id);
        const classList = await unpackageClassObjects([classObjInc]);

        await sendEmail(
          'email_admin_class_cancel.html',
          process.env.EMAIL_TO ?? process.env.EMAIL_FROM,
          'Class Cancellation',
          {
            name: `${req.session.user.first_name} ${req.session.user.last_name}`,
            email: req.session.user.email,
            class_type: classList[0].name,
            day: formatDate(classList[0].start_datetime),
            time: formatTime(classList[0].start_datetime, true)
          }
        );

        const data = await getAccountPageData(req.session.user, "Successfully cancelled class registration.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      } else {
        const data = await getAccountPageData(req.session.user, "Error while cancelling: Not registered.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      }
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
