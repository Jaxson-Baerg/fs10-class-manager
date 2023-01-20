const express = require('express');
const router = express.Router();

const { updateHistory } = require('../helpers/operationHelpers');

// Render the about page (might be deleted later)
router.get('/', async (req, res) => {
  try {
    req.session.history = updateHistory(req.session.history, 'about/');
    res.render('../../client/views/pages/about', { user: req.session.user });
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;