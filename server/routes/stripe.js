const express = require('express');
const router = express.Router();

require('dotenv').config();

const chalk = require('chalk');
const stripe = require('stripe');
const { addSubscriptionCredits } = require('../helpers/operationHelpers');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// stripe webhook
router.post('/', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    switch (event.type) {
      case 'invoice.paid':
        console.log(chalk.green('Subscription payment success'));
        addSubscriptionCredits(event.data.object);
        res.status(200).json({ message: 'Subscription payment processed' });
        break;
      case 'invoice.payment_failed':
        console.log(chalk.red('Subscription payment failed'));
        res.status(200).json({ message: 'Unhandled event type: invoice.payment_failed' });
        break;
      case 'invoice.upcoming':
        console.log(chalk.yellow('Subscription payment upcoming.'));
        res.status(200).json({ message: 'Unhandled event type: invoice.upcoming' });
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        res.status(200).json({ message: `Unhandled event type: ${event.type}` });
    }
  } catch(err) {
    console.log(chalk.red.bold(`Error (${err.status}): `) + " " + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;