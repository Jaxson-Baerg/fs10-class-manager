const express = require('express');
const router = express.Router();
// const nodemailer = require('nodemailer');
// const cron = require('node-cron');

require('dotenv').config();

const { getStudents, getStudentByEmail, getStudentById, getStudentCodeById, updateStudent, addStudent } = require('../db/queries/studentQueries');
const { getClassesForStudent } = require('../db/queries/classStudentQueries');
const { getClassList, unpackageClassObjects } = require('../helpers/classHelpers');

// Get a list of all students in database
router.get('/', async (req, res) => {
  try {
    const students = await getStudents();
    res.json(students);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('../../');
});

// Get a student by their email
router.get('/email/:email', async (req, res) => {
  try {
    const student = await getStudentByEmail(req.params.email);
    res.json(student);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a student by their id
router.get('/:id', async (req, res) => {
  try {
    const student = await getStudentById(Number(req.params.id));
    res.json(student);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student code by id
router.get('/code/:id', async (req, res) => {
  try {
    const code = await getStudentCodeById(Number(req.params.id));
    res.json(code);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// // Send code email to student's email
// router.get('/send/:email', async (req, res) => {
//   try {
//     let transporter = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     let info = await transporter.sendMail({
//       from: '"EasyFit " <jaxson.baerg@zohomail.com>',
//       to: 'jaxson.baerg@gmail.com',
//       subject: 'Hello',
//       text: `Here is login code from EasyFit! ${req.query.unique_code}`,
//     });

//     res.json(info);
//   } catch(err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Send an email receipt after a purchase
// router.get('/send/:email/receipt/:credits/:subtotal', async (req, res) => {
//   try {
//     let transporter = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     let info = await transporter.sendMail({
//       from: '"EasyFit " <jaxson.baerg@zohomail.com>',
//       to: 'jaxson.baerg@gmail.com',
//       subject: 'Receipt for Recent Purchase',
//       text: `Thank you for your purchase! You have bought ${req.params.credits} credits for a total of $${req.params.subtotal} CAD`,
//     });

//     res.json(info);
//   } catch(err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Send reminder email to student's email about upcoming class
// router.get('/send/:email/reminder/:month/:day/:hours/:minutes', async (req, res) => {
//   try {
//     let transporter = nodemailer.createTransport({
//       host: "smtp.zoho.com",
//       port: 465,
//       secure: true,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     let task = cron.schedule(`${req.params.minutes} ${req.params.hours} ${req.params.day} ${req.params.month} 2`, async () => {
//       let info = await transporter.sendMail({
//         from: '"EasyFit " <jaxson.baerg@zohomail.com>',
//         to: 'jaxson.baerg@gmail.com',
//         subject: 'Reminder',
//         text: `Just a friendly reminder about your upcoming class in ${req.params.hours} hours!`,
//       });

//       res.json(info);
//     });

//     setTimeout(() => {
//       task.stop();
//     }, 1000 * 60 * 60 * 24 + 5);

//   } catch(err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Update a student's information
router.put('/:id', async (req, res) => {
  try {
    const student = await updateStudent(Number(req.params.id), req.query);
    res.json(student);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new student in the database
router.post('/', async (req, res) => {
  const { first_name, last_name, email } = req.query;
    try {
      const student = await addStudent(first_name, last_name, email);
      res.json(student);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
});

// Get all class ids that a student is registered for
router.get('/:id/classes/id', async (req, res) => {
  try {
    const classIds = await getClassesForStudent(Number(req.params.id)); // Get all class ids
    res.json(classIds);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all classes that a student is registered for
router.get('/:id/classes', async (req, res) => {
  try {
    const classIds = await getClassesForStudent(Number(req.params.id)); // Get all class ids
    const classesInc = await getClassList(classIds); // Get all class objects
    const classesCom = await unpackageClassObjects(classesInc); // Append all class type data onto class objects
    res.json(classesCom.sort(c => -c.start_datetime));
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
