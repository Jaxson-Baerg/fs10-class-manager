const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.render('../../client/views/pages/about');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;