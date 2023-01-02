const express = require('express');
const router = express.Router();

require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_API_SECRET_KEY);

const { updateStudent, getStudentById } = require('../db/queries/studentQueries');
const { getClassesByClassType } = require('../db/queries/classQueries');
const { registerStudent, cancelRegistration, getClassesForStudent, getCompletedClasses } = require('../db/queries/classStudentQueries');
const { getSpotsRemaining, getClassList, unpackageClassObjects } = require('../helpers/classStudentHelpers');
const { formatDate, formatTime, updateHistory, sortClasses } = require('../helpers/operationHelpers');
const { getClassTypeById } = require('../db/queries/classTypeQueries');
const { getAccountPageData } = require('../helpers/renderHelpers');

// Render the schedule page for a given class type
router.get('/:class_type_id', async (req, res) => {
  try {
    const classType = await getClassTypeById(req.params.class_type_id);
    const classList = await getClassesByClassType(req.params.class_type_id);
    const classListInc = await getSpotsRemaining(classList);
    const classListCom = await sortClasses(classListInc);

    req.session.history = updateHistory(req.session.history, `schedule/${req.params.class_type_id}`);
    res.render('../../client/views/pages/schedule', { user: req.session.user, classList: classListCom, formatDate, formatTime, confirm: undefined, classType });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the confirmation page to allow the user a second chance
router.post('/register/confirm', async (req, res) => {
  try {
    if (req.session.user) {
      if (req.session.user.credits > req.body.credits) {
        res.render('../../client/views/pages/class_register', { user: req.session.user, class_type_id: req.body.class_type_id, class_id: req.body.class_id, credits: req.body.credits });
      } else {
        const subscriptions = req.session.user.customer_id ? await stripe.subscriptions.list({
          customer: req.session.user.customer_id
        }) : null;

        req.session.history = updateHistory(req.session.history, 'purchase/');
        res.render('../../client/views/pages/purchase', { user: req.session.user, subscriptions: subscriptions.data, message: `You do not have enough credits to register for this class. You need ${req.body.credits - req.session.user.credits} more to register.`, strike_pk: process.env.STRIPE_API_PUBLIC_KEY});
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Process class registration and redirect to account page
router.post('/register', async (req, res) => {
  try {
    if (req.session.user) {
      await registerStudent(req.body.class_id, req.session.user.student_id);
      await updateStudent(req.session.user.student_id, { credits: req.session.user.credits - req.body.credits });
      req.session.user = await getStudentById(req.session.user.student_id);

      const data = await getAccountPageData(req.session.user, "Successfully registered.");

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
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
    res.status(500).json({ error: err.message });
  }
});

// Cancel a user's class registration and refund their credits
router.post('/cancel', async (req, res) => {
  try {
    if (req.session.user) {
      await cancelRegistration(req.body.class_id, req.session.user.student_id);
      await updateStudent(req.session.user.student_id, { credits: Number(req.session.user.credits) + Number(req.body.credits) });
      req.session.user = await getStudentById(req.session.user.student_id);

      const data = await getAccountPageData(req.session.user, "Successfully cancelled class registration.");

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
    } else {
      res.redirect('/');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;