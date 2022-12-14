const express = require('express');
const router = express.Router();

const { getClassTypes } = require('../db/queries/classTypeQueries');

router.get('/', async (req, res) => {
  try {
    const typeList = await getClassTypes();
    res.render('../../client/views/pages/home', { typeList });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;