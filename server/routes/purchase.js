const express = require('express');
const router = express.Router();
const chalk = require('chalk');

require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_API_SECRET_KEY);

const { updateStudent, getStudentById } = require('../db/queries/studentQueries');
const { updateHistory, sendEmail } = require('../helpers/operationHelpers');
const { getAccountPageData, getPurchasePageData } = require('../helpers/renderHelpers');

// Render the purchase page (might modify later for subscription page)
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user = await getStudentById(req.session.user.student_id);

      const data = await getPurchasePageData(req.session.user);

      req.session.history = updateHistory(req.session.history, 'purchase/');
      res.render('../../client/views/pages/purchase', data);
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to purchase credits." });
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/checkout', async (req, res) => {
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

router.post('/checkout', async (req, res) => {
  try {
    if (req.session.user) {
      if (!req.session.user.customer_id) { // Create new stripe customer token if account doesn't have one already

        const customer = await stripe.customers.create({
          name: req.session.user.first_name + ' ' + req.session.user.last_name,
          email: req.session.user.email,
          source: req.body.stripeToken
        });

        const student = await updateStudent(req.session.user.student_id, {
          customer_id: customer.id
        });

        req.session.user = student;
      }

      if (req.body['credit-options'] === 'one-time') { // One-time purchase logic
        await stripe.charges.create({
          amount: req.body['credit-amount'] * process.env.ONE_TIME_CREDIT_COST_CENTS,
          currency: 'cad',
          customer: req.session.user.customer_id,
          description: `One-time charge for ${req.body['credit-amount']} credits. ($${(process.env.ONE_TIME_CREDIT_COST_CENTS / 100).toFixed(2)}/credit)`
        });

        // add credits
        student = await updateStudent(req.session.user.student_id, {
          credits: req.session.user.credits + Number(req.body['credit-amount'])
        });
        req.session.user = student;

        // email user
        await sendEmail(
          'email_receipt.html',
          process.env.EMAIL_TO ?? student.email,
          'Purchase Receipt',
          {
            type: "one-time",
            credits: req.body['credit-amount'],
            cost: `$${((req.body['credit-amount'] * process.env.ONE_TIME_CREDIT_COST_CENTS) / 100).toFixed(2)}`,
            balance: req.session.user.credits,
            subMsg: '',
            host_url: process.env.HOST_URL,
            plural: req.body['credit-amount'] > 1 ? 's' : ''
          }
        );

        const data = await getAccountPageData(req.session.user, "One-time payment successful.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
        
      } else { // Subscription payment logic

        let price_id;
        let subCost;
        if (req.body['credit-amount'][1] == 5) {
          price_id = process.env.SUB_OPTION_ONE_PRICE_ID;
          subCost = process.env.SUB_OPTION_ONE_CREDIT_COST_CENTS;
        } else if (req.body['credit-amount'][1] == 8) {
          price_id = process.env.SUB_OPTION_TWO_PRICE_ID;
          subCost = process.env.SUB_OPTION_TWO_CREDIT_COST_CENTS;
        }

        const subscription = await stripe.subscriptions.create({
          customer: req.session.user.customer_id,
          items: [
            {price: price_id}
          ]
        });

        // add credits for display on account page - credits are added to account and email receipt sent via webhook
        req.session.user.credits += Number(req.body['credit-amount'][1]);

        const data = await getAccountPageData(req.session.user, "Subscription payment successful.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to purchase credits." });
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscription/cancel', async (req, res) => {
  try {
    res.redirect('/account');
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscription/cancel', async (req, res) => {
  try {
    if (req.session.user) {
      const subscriptions = await stripe.subscriptions.list({
        customer: req.session.user.customer_id
      });
      await stripe.subscriptions.del(subscriptions.data[0].id);

      const data = await getAccountPageData(req.session.user, "Subscription successfully cancelled.");

      req.session.history = updateHistory(req.session.history, 'account/');
      res.render('../../client/views/pages/account', data);
    } else {
      res.redirect('/');
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

// TODO add webhook endpoint for credit adding every month
router.get('/invoice/:customer_token', async (req, res) => {
  try {
    
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;