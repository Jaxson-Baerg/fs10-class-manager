const cron = require('node-cron');

require('dotenv').config();

const { getClasses } = require('../db/queries/classQueries');
const { sendEmail } = require('./operationHelpers');
const { getStudentsForClass } = require('../db/queries/classStudentQueries');

const initScheduledJobs = () => {
  const classReminderEmail = cron.schedule("0 */1 * * *", async () => {
    console.log("Running CronJob.");
    const classes = await getClasses();

    classes.forEach(async c => {
      if (c.time_to_class.days === 1 && !c.time_to_class.hours) {

        const students = await getStudentsForClass(c.class_id);

        students.forEach(async s => {
          console.log(`sending class reminder for ${c.name} to ${s.email}.`);
          await sendEmail(
            'email_class_reminder.html',
            process.env.EMAIL_TO ?? s.email,
            "Class Reminder",
            {
              class_type: c.name
            }
          )
        });
      }
    })
  });

  classReminderEmail.start();
};

module.exports = {
  initScheduledJobs
};