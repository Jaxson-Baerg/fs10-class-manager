const express = require('express');
const router = express.Router();
const chalk = require('chalk');

const { getClassTypes } = require('../db/queries/classTypeQueries');
const { getClasses } = require('../db/queries/classQueries');
const { updateHistory } = require('../helpers/operationHelpers');

// Render the home page with class types list displayed
router.get('/', async (req, res) => {
  try {
    const typeList = await getClassTypes();
    const classList = await getClasses();

    req.session.history = updateHistory(req.session.history, '/');
    res.render('../../client/views/pages/home', { typeList, classList, user: req.session.user });
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
