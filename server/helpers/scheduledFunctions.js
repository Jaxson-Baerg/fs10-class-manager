const schedule = require('node-schedule');

require('dotenv').config();

const { sendEmail } = require('./operationHelpers');

const scheduleEmail = (date, emailObj) => {
  schedule.scheduleJob(date, async () => {
    await sendEmail(
      emailObj.file,
      emailObj.email_to,
      emailObj.subject,
      { ...emailObj }
    );
  });
};

module.exports = {
  scheduleEmail
};