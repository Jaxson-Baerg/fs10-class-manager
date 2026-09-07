const express = require('express');
const router = express.Router();
const chalk = require('chalk');

require('dotenv').config();

const { changeStudentCredits, getStudentById } = require('../db/queries/studentQueries');
const { getClassesByClassType, getClassById } = require('../db/queries/classQueries');
const {
  registerStudentForClassWithCredits,
  registerStudentForRetreatWithCredits,
  cancelRegistration,
  getClassesForStudent,
  getStudentsForClass
} = require('../db/queries/classStudentQueries');
const { getSpotsRemaining, unpackageClassObjects } = require('../helpers/classStudentHelpers');
const { formatDate, formatTime, updateHistory, sortClasses, sendEmail } = require('../helpers/operationHelpers');
const { getClassTypeById } = require('../db/queries/classTypeQueries');
const { getAccountPageData, getPurchasePageData } = require('../helpers/renderHelpers');

// Render the schedule page for a given class type
router.get('/class/:class_type_id/', async (req, res) => {
  try {
    const classType = await getClassTypeById(req.params.class_type_id);
    let classList = await getClassesByClassType(req.params.class_type_id, req.session.user ? req.session.user.student_id : undefined);

    req.session.history = updateHistory(req.session.history, `schedule/class/${req.params.class_type_id}`);

    if (classType.name.match(/(retreat)/gi)) {
      res.render('../../client/views/pages/schedule_retreat', { user: req.session.user, classList: classList, formatDate, formatTime, confirm: undefined, classType });
    } else {
      res.render('../../client/views/pages/schedule', { user: req.session.user, classList: classList, formatDate, formatTime, confirm: undefined, classType });
    }
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
      const classObj = await getClassById(req.body.class_id);

      if (!classObj || !classObj.can_register) {
        return res.redirect('/');
      }

      const studentClasses = await getClassesForStudent(req.session.user.student_id);
      const alreadyRegistered = studentClasses.some(c => Number(c.class_id) === Number(classObj.class_id));

      if (alreadyRegistered) {
        return res.redirect('/');
      }

      const students = await getStudentsForClass(classObj.class_id);
      const spotsRemaining = Number(classObj.max_students) - students.length;

      if (spotsRemaining < 1) {
        return res.redirect('/');
      }

      if (!req.session.user.waiver_signed_at) {
        return res.redirect('/account/waiver');
      }

      if (Number(req.session.user.credits) < Number(classObj.credit_cost)) {
        const data = await getPurchasePageData(
          req.session.user,
          `You do not have enough credits to register for this class. You need ${Number(classObj.credit_cost) - Number(req.session.user.credits)} more to register.`
        );

        req.session.history = updateHistory(req.session.history, 'purchase/');
        return res.render('../../client/views/pages/purchase', data);
      }

      // Ensure session user has latest credits (optional but helps consistency)
      req.session.user = await getStudentById(req.session.user.student_id);

      return res.render('../../client/views/pages/class_register', {
        user: req.session.user,
        class_type_id: classObj.class_type_id,
        class_id: classObj.class_id,
        credits: classObj.credit_cost
      });
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/register/retreat/confirm', async (req, res) => {
  try {
    res.redirect('/');
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Render the confirmation page to allow the user a second chance
router.post('/register/retreat/confirm', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = await getStudentById(req.session.user.student_id);

      const studentClasses = await getClassesForStudent(req.session.user.student_id);
      let eventsToRegister = [];
      let classTypeId;
      let totalCredits = 0;

      const selectedClassIds = Object.keys(req.body)
        .map(arg => {
          const match = arg.match(/(.*)-class_id/);
          return match ? Number(match[1]) : null;
        })
        .filter(Boolean);

      for (const classId of selectedClassIds) {
        const classObj = await getClassById(classId);

        if (!classObj || !classObj.can_register) {
          return res.redirect('/');
        }

        const alreadyRegistered = studentClasses.some(
          c => Number(c.class_id) === Number(classObj.class_id)
        );

        const students = await getStudentsForClass(classObj.class_id);
        const spotsRemaining = Number(classObj.max_students) - students.length;

        if (alreadyRegistered || spotsRemaining < 1) {
          return res.redirect('/');
        }

        if (!classTypeId) {
          classTypeId = classObj.class_type_id;
        }
        totalCredits += Number(classObj.credit_cost);
        eventsToRegister.push({ class_id: classObj.class_id });
      }

      if (req.session.user.credits >= totalCredits) {
        res.render('../../client/views/pages/retreat_register', { user: req.session.user, class_type_id: classTypeId, events: eventsToRegister, credits: totalCredits });
      } else {
        const data = await getPurchasePageData(
          req.session.user,
          `You do not have enough credits to register for the selected options for the retreat. You need ${totalCredits - req.session.user.credits} more to register.`
        );

        req.session.history = updateHistory(req.session.history, 'purchase/');
        res.render('../../client/views/pages/purchase', data);
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for this retreat."});
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
      const result = await registerStudentForClassWithCredits(
        req.body.class_id,
        req.session.user.student_id
      );

      req.session.user = await getStudentById(req.session.user.student_id);

      if (result.status === 'registered') {
        const classObjInc = await getClassById(result.classId);
        const classList = await unpackageClassObjects([classObjInc]);

        // send user email
        await sendEmail(
          'email_class_register.html',
          process.env.EMAIL_TO || req.session.user.email,
          'Class Confirmation',
          {
            class_type: classList[0].name,
            day: formatDate(classList[0].start_datetime),
            time: formatTime(classList[0].start_datetime, true),
            description: classList[0].description,
            overrideDescription: classList[0].description.length > 0
          }
        );

        // send admin email
        await sendEmail(
          'email_admin_class_register.html',
          process.env.EMAIL_TO || process.env.EMAIL_FROM,
          'Class Registration',
          {
            name: `${req.session.user.first_name} ${req.session.user.last_name}`,
            email: req.session.user.email,
            class_type: classList[0].name,
            day: formatDate(classList[0].start_datetime),
            time: formatTime(classList[0].start_datetime, true)
          }
        );

        const data = await getAccountPageData(req.session.user, 'Successfully registered.');
        req.session.history = updateHistory(req.session.history, 'account/');
        return res.render('../../client/views/pages/account', data);
      }

      if (result.status === 'insufficient_credits') {
        const data = await getPurchasePageData(
          req.session.user,
          `You do not have enough credits to register for this class. You need ${result.creditsNeeded} more to register.`
        );

        req.session.history = updateHistory(req.session.history, 'purchase/');
        return res.render('../../client/views/pages/purchase', data);
      }

      const message = result.status === 'already_registered'
        ? 'Already registered!'
        : 'Unable to register for this class.';

      const data = await getAccountPageData(req.session.user, message);
      req.session.history = updateHistory(req.session.history, 'account/');
      return res.render('../../client/views/pages/account', data);
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "You must login first to register for a class."});
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/retreat/register', async (req, res) => {
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

// Process retreat registration and redirect to account page
router.post('/retreat/register', async (req, res) => {
  try {
    if (req.session.user) {
      const classIds = Array.isArray(req.body.class_ids)
        ? req.body.class_ids
        : [req.body.class_ids].filter(Boolean);

      const result = await registerStudentForRetreatWithCredits(
        classIds,
        req.session.user.student_id
      );

      req.session.user = await getStudentById(req.session.user.student_id);

      if (result.status === 'registered') {
        for (const classId of result.classIds) {
          const classObjInc = await getClassById(classId);
          const classList = await unpackageClassObjects([classObjInc]);

          await sendEmail(
            'email_retreat_class_register.html',
            process.env.EMAIL_TO || req.session.user.email,
            'Class Confirmation',
            {
              class_type: classList[0].name,
              day: formatDate(classList[0].start_datetime),
              time: formatTime(classList[0].start_datetime, true),
              description: classList[0].description
            }
          );

          await sendEmail(
            'email_admin_class_register.html',
            process.env.EMAIL_TO || process.env.EMAIL_FROM,
            'Class Registration',
            {
              name: `${req.session.user.first_name} ${req.session.user.last_name}`,
              email: req.session.user.email,
              class_type: classList[0].name,
              day: formatDate(classList[0].start_datetime),
              time: formatTime(classList[0].start_datetime, true)
            }
          );
        }

        const data = await getAccountPageData(req.session.user, 'Successfully registered.');
        req.session.history = updateHistory(req.session.history, 'account/');
        return res.render('../../client/views/pages/account', data);
      }

      if (result.status === 'insufficient_credits') {
        const data = await getPurchasePageData(
          req.session.user,
          `You do not have enough credits to register for the selected options for the retreat. You need ${result.creditsNeeded} more to register.`
        );

        req.session.history = updateHistory(req.session.history, 'purchase/');
        return res.render('../../client/views/pages/purchase', data);
      }

      const message = result.status === 'already_registered'
        ? 'Already registered!'
        : 'Unable to register for the selected retreat events.';

      const data = await getAccountPageData(req.session.user, message);
      req.session.history = updateHistory(req.session.history, 'account/');
      return res.render('../../client/views/pages/account', data);
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
        await changeStudentCredits(
          req.session.user.student_id,
          Number(req.body.credits),
          'Class Cancellation'
        );
        req.session.user = await getStudentById(req.session.user.student_id);

        const classObjInc = await getClassById(req.body.class_id);
        const classList = await unpackageClassObjects([classObjInc]);

        await sendEmail(
          'email_admin_class_cancel.html',
          process.env.EMAIL_TO || process.env.EMAIL_FROM,
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
