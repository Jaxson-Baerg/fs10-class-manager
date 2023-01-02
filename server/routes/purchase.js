const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const router = express.Router();

require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_API_SECRET_KEY);

const { updateStudent } = require('../db/queries/studentQueries');
const { updateHistory } = require('../helpers/operationHelpers');
const { getAccountPageData } = require('../helpers/renderHelpers');

// Render the purchase page (might modify later for subscription page)
router.get('/', async (req, res) => {
  try {
    if (req.session.user) {
      const subscriptions = req.session.user.customer_id ? await stripe.subscriptions.list({
        customer: req.session.user.customer_id
      }) : null;

      req.session.history = updateHistory(req.session.history, 'purchase/');
      res.render('../../client/views/pages/purchase', { user: req.session.user, subscriptions: subscriptions.data, message: undefined , stripe_pk: process.env.STRIPE_API_PUBLIC_KEY, credit_cost: { one_time: process.env.ONE_TIME_CREDIT_COST_CENTS, sub_option_one: process.env.SUB_OPTION_ONE_CREDIT_COST_CENTS, sub_option_two: process.env.SUB_OPTION_TWO_CREDIT_COST_CENTS }});
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to purchase credits." });
    }
  } catch(err) {
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
          amount: req.body['credit-amount'] * process.env.CREDIT_COST_CENTS,
          currency: 'cad',
          customer: req.session.user.customer_id
        });

        // add credits
        student = await updateStudent(req.session.user.student_id, {
          credits: req.session.user.credits + Number(req.body['credit-amount'])
        });
        req.session.user = student;

        // email user
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const filePath = path.join(__dirname, '../views/email_receipt.html');
        const source = fs.readFileSync(filePath, 'utf-8').toString();
        const template = handlebars.compile(source);
        const replacements = {
          type: "one-time",
          credits: req.body['credit-amount'],
          cost: `$${((req.body['credit-amount'] * process.env.CREDIT_COST_CENTS) / 100).toFixed(2)}`,
          balance: req.session.user.credits,
          subMsg: '',
          host_url: process.env.HOST_URL
        };
        const htmlToSend = template(replacements);
  
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO ?? student.email,
          subject: process.env.COMPANY + ' Purchase Receipt',
          html: htmlToSend
        });

        const data = await getAccountPageData(req.session.user, "One-time payment successful.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      } else { // Subscription payment logic
        const subscription = await stripe.subscriptions.create({
          items: [{
              price_data: {
                currency: 'cad',
                product: 'prod_N58T3ntKku2YBZ',
                recurring: { interval: 'month' },
                unit_amount: req.body['credit-amount'] * process.env.CREDIT_COST_CENTS
              }
            }],
          customer: req.session.user.customer_id
        });

        // add credits
        student = await updateStudent(req.session.user.student_id, {
          credits: req.session.user.credits + Number(req.body['credit-amount'])
        });
        req.session.user = student;

        // email user
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const filePath = path.join(__dirname, '../views/email_receipt.html');
        const source = fs.readFileSync(filePath, 'utf-8').toString();
        const template = handlebars.compile(source);
        const replacements = {
          type: "subscription",
          credits: req.body['credit-amount'],
          cost: `$${((req.body['credit-amount'] * process.env.CREDIT_COST_CENTS) / 100).toFixed(2)}`,
          balance: req.session.user.credits,
          subMsg: `You will be reminded three days before the renewal day on ${new Date(subscription.current_period_end * 1000).toString().split(/ \d{2}:\d{2}:\d{2} /)[0]} and each month afterwards. You may view or cancel your subscription anytime on your account page.`,
          host_url: process.env.HOST_URL
        };
        const htmlToSend = template(replacements);
  
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO ?? student.email,
          subject: process.env.COMPANY + ' Subscription Receipt',
          html: htmlToSend
        });

        const data = await getAccountPageData(req.session.user, "Subscription payment successful.");

        req.session.history = updateHistory(req.session.history, 'account/');
        res.render('../../client/views/pages/account', data);
      }
    } else {
      req.session.history = updateHistory(req.session.history, 'account/login');
      res.render('../../client/views/pages/account_email_login', { user: req.session.user, message: "Please login to purchase credits." });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscription/cancel', async (req, res) => {
  try {
    res.redirect('/account');
  } catch(err) {
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
    res.status(500).json({ error: err.message });
  }
});

// TODO add webhook endpoint for credit adding every month
router.get('/invoice/:customer_token', async (req, res) => {
  try {
    
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;