const express = require('express');
const router = express.Router();
const chalk = require('chalk');

const { updateHistory } = require('../helpers/operationHelpers');

// Render the testimials page
router.get('/', async (req, res) => {
  try {
    req.session.history = updateHistory(req.session.history, 'testimonials/');
    res.render('../../client/views/pages/testimonials', { user: req.session.user });
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
