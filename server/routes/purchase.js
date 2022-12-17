const express = require('express');
const router = express.Router();

const { updateHistory } = require('../helpers/operationHelpers');

// Render the purchase page (might modify later for subscription page)
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.history = updateHistory(req.session.history, 'purchase/');
      res.render('../../client/views/pages/purchase', { user: req.session.user, message: undefined });
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to purchase credits." });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;