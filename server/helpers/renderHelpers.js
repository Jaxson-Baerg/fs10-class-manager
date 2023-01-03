const stripe = require('stripe')(process.env.STRIPE_API_SECRET_KEY);

require('dotenv').config();

const { getClassesForStudent, getCompletedClasses } = require('../db/queries/classStudentQueries');

const { getClassList, unpackageClassObjects } = require('./classStudentHelpers');
const { formatDate, formatTime, sortClasses } = require('./operationHelpers');

const getAccountPageData = async (user, message) => {
  const classIds = await getClassesForStudent(user.student_id); // Get all class ids
  const classesInc = await getClassList(classIds); // Get all class objects
  const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects
  const classListCom = sortClasses(classesCom);

  const numComClasses = await getCompletedClasses(user.student_id);

  const subscriptions = user.customer_id ? await stripe.subscriptions.list({
    customer: user.customer_id
  }) : { data: [] };

  let subCost;
  if (subscriptions.data[0]) {
    if (subscriptions.data[0].plan.amount === 10000) {
      subCost = 2000;
    } else if (subscriptions.data[0].plan.amount === 15000) {
      subCost = 1875;
    }
  }

  return {
    user,
    subscription: subscriptions.data[0] ? {
      id: subscriptions.data[0].id,
      next_invoice: new Date(subscriptions.data[0].current_period_end * 1000).toString().split(/ \d{2}:\d{2}:\d{2} /)[0],
      price: `$${(subscriptions.data[0].plan.amount / 100).toFixed(2)}`,
      credit_amount: subscriptions.data[0].plan.amount / subCost
    } : null,
    formatDate,
    formatTime,
    classes: classListCom.sort(c => c.start_datetime),
    numComClasses,
    message
  };
};

module.exports = {
  getAccountPageData
};