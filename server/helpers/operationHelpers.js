const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const chalk = require('chalk');

const { getStudentByStripeId, updateStudent } = require('../db/queries/studentQueries');

require('dotenv').config();

// Format the timestamp given into a human readable date string
const formatDate = (timestamp) => { // 2022-12-15T14:30:00.000Z
  const dateStr = `${timestamp}`; // "Thu Dec 15 2022 07:30:00 GMT-0700 (Mountain Standard Time)"

  const tempDate = dateStr.split(' '); // tempDate = ["Thu", "Dec", "15", "2022", "07:30:00", "GMT-0700", "(Mountain", "Standard" ,"Time)"]
  return `${tempDate[0]} ${tempDate[1]} ${tempDate[2]}, ${tempDate[3]}`; // "Thu Dec 15, 2022"
};

// Format the timestamp given into a human readable time string
const formatTime = (timestamp, timezone) => {
  const dateStr = `${timestamp}`;

  const tempDate = dateStr.split(' '); // tempDate = ["Thu", "Dec", "15", "2022", "16:30:00", "GMT-0700", "(Mountain", "Standard" ,"Time)"]
  return `${tempDate[4].split(':')[0] > 12 ? tempDate[4].split(':')[0] - 12 : tempDate[4].split(':')[0].split('')[0] === "0" ? tempDate[4].split(':')[0].split('')[1] : tempDate[4].split(':')[0]}:${tempDate[4].split(':')[1]} ${tempDate[4].split(':')[0] > 11 ? "PM" : "AM"} ${timezone ? `MST` : ''}`; // 4:30 PM
}; // Depends on if different timezones are needed: timezone ? `${tempDate[6]} ${tempDate[7]} ${tempDate[8]}` : ''

// Update the session history array to track where the user goes
const updateHistory = (history, url) => {
  history ? history = [...history, url] : history = [url];

  if (history.length > 5) history.shift();

  return history;
};

// Sort past classes to the end of the array
const sortClasses = (classes) => {
  classes.forEach(c => {
    if (!c.can_register) {
      classes.splice(classes.indexOf(c), 1);
      classes.push(c);
    }
  });

  return classes;
};

const sendEmail = async (file, email_to, subject, data) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Compile HTML for email styling and variable passing
  const filePath = path.join(__dirname, `../views/${file}`);
  const source = fs.readFileSync(filePath, 'utf-8').toString();
  const template = handlebars.compile(source);
  const replacements = {
    ...data
  };
  const htmlToSend = template(replacements);

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email_to,
    subject: process.env.COMPANY + ` ${subject}`,
    html: htmlToSend
  });

  return result;
};

const addSubscriptionCredits = async (invoice) => {
  try {
    const student = await getStudentByStripeId(invoice.customer);

    await updateStudent(student.student_id, { credits: student.credits + (invoice.amount_paid == 100000 ? 5 : 8) });
  } catch(err) {
    console.log(chalk.red.bold(`Error while adding subscription credits (${err.status}): `) + " " + err.message);
  }
};

module.exports = {
  formatDate,
  formatTime,
  updateHistory,
  sortClasses,
  sendEmail,
  addSubscriptionCredits
};