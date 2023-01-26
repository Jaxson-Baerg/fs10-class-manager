const express = require('express');
const router = express.Router();

require('dotenv').config();

const chalk = require('chalk');
const stripe = require('stripe');

const endpointSecret = process.env.STRIPE_SECRET;

// stripe webhook
router.post('/', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('foo');
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;