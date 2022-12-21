const express = require('express');
const router = express.Router();

require('dotenv').config();

const { getClassesByClassType, getClassById } = require('../db/queries/classQueries');
const { getStudentsForClass } = require('../db/queries/classStudentQueries');
const { getClassTypes, getClassTypeById } = require('../db/queries/classTypeQueries');
const { getSpotsRemaining, getStudentList } = require('../helpers/classHelpers');
const { formatDate, formatTime, updateHistory, sortClasses } = require('../helpers/operationHelpers');

// Render the admin page if the admin password has been given, with all class types
router.get('/', async (req, res) => {
  try {
    if (req.session.admin) {
      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render all classes in a given class type
router.get('/schedule/:class_type_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classType = await getClassTypeById(req.params.class_type_id);

      const classList = await getClassesByClassType(req.params.class_type_id);
      const classListInc = await getSpotsRemaining(classList);
      const classListCom = await sortClasses(classListInc);
      
      req.session.history = updateHistory(req.session.history, `admin/schedule/${req.params.class_type_id}`);
      res.render('../../client/views/pages/admin_schedule', { user: req.session.user, formatDate, formatTime, classList: classListCom, classType });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render all students in a given class
router.get('/class/:class_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classObj = await getClassById(req.params.class_id);
      const studentIdList = await getStudentsForClass(req.params.class_id);
      const studentObjList = await getStudentList(studentIdList);

      req.session.history = updateHistory(req.session.history, `admin/class/${req.params.class_id}`);
      res.render('../../client/views/pages/admin_class', { user: req.session.user, formatDate, formatTime, classObj, studentList: studentObjList });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the create class type form page
router.get('/create/class_type', async (req, res) => {
  try {
    if (req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/create/class_type');
      res.render('../../client/views/pages/admin_create_class_type', { user: req.session.user });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the submitted class type in the database and redirect to the admin home page
router.post('/create/class_type', async (req, res) => {
  try {
    if (req.session.admin) {

    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the create class form page
router.get('/create/class', async (req, res) => {
  try {
    if (req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/create/class');
      res.render('../../client/views/pages/admin_create_class', { user: req.session.user });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the submitted class type in the database and redirect to the admin home page
router.post('/create/class', async (req, res) => {
  try {
    if (req.session.admin) {

    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the admin login page to enter the password stored in the .env file
router.get('/login', async (req, res) => {
  try {
    if (!req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/login');
      res.render('../../client/views/pages/admin_login', { user: req.session.user, message: undefined });
    } else {
      res.redirect('/admin');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the admin session cookie
router.post('/login', async (req, res) => {
  try {
    if (req.body.password === process.env.ADMIN_PASS) {
      req.session.admin = true;
      res.redirect('/admin');
    } else {
      req.session.history = updateHistory(req.session.history, 'admin/login');
      res.render('../../client/views/pages/admin_login', { user: req.session.user, message: "Password incorrect."})
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;