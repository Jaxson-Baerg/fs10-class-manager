const express = require('express');
const router = express.Router();

const { updateStudent, getStudentById } = require('../db/queries/studentQueries');
const { getClassesByClassType } = require('../db/queries/classQueries');
const { registerStudent, cancelRegistration, getClassesForStudent } = require('../db/queries/classStudentQueries');
const { getSpotsRemaining, getClassList, unpackageClassObjects } = require('../helpers/classHelpers');
const { formatDate, formatTime, updateHistory, sortClasses } = require('../helpers/operationHelpers');

// Render the schedule page for a given class type
router.get('/:class_type_id', async (req, res) => {
  try {
    const classList = await getClassesByClassType(req.params.class_type_id);
    const classListInc = await getSpotsRemaining(classList);
    const classListCom = await sortClasses(classListInc);

    req.session.history = updateHistory(req.session.history, `schedule/${req.params.class_type_id}`);
    res.render('../../client/views/pages/schedule', { user: req.session.user, classList: classListCom, formatDate, formatTime, confirm: undefined });
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
        req.session.history = updateHistory(req.session.history, 'purchase/');
        res.render('../../client/views/pages/purchase', { user: req.session.user, message: `You do not have enough credits to register for this class. You need ${req.body.credits - req.session.user.credits} more to register.`});
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

      const classIds = await getClassesForStudent(req.session.user.student_id); // Get all class ids
      const classesInc = await getClassList(classIds); // Get all class objects
      const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', { user: req.session.user, formatDate, formatTime, classes: classesCom.sort(c => c.start_datetime), message: "Successfully registered." });
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

      const classIds = await getClassesForStudent(req.session.user.student_id); // Get all class ids
      const classesInc = await getClassList(classIds); // Get all class objects
      const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', { user: req.session.user, formatDate, formatTime, classes: classesCom.sort(c => c.start_datetime), message: "Successfully cancelled." });
    } else {
      res.redirect('/');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;