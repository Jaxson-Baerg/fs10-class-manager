const express = require('express');
const router = express.Router();

require('dotenv').config();

const { updateHistory } = require('../helpers/operationHelpers');

// Render the admin page if the admin password has been given
router.get('/', async (req, res) => {
  try {
    if (req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user });
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