const express = require('express');
const router = express.Router();

const { getClasses, getClassById, getClassesByClassType, createClass, deleteClass } = require('../db/queries/classQueries');
const { getStudentsForClass, registerStudent, cancelRegistration } = require('../db/queries/classStudentQueries');
const { getStudentList, unpackageClassObjects, getSpotsRemaining } = require('../helpers/classHelpers');

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await getClasses();
    res.json(classes);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single class by its id
router.get('/:class_id', async (req, res) => {
  try {
    const classesInc = await getClassById(Number(req.params.class_id));
    const classesCom = await unpackageClassObjects([classesInc]);
    res.json(classesCom);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a list of classes by the type
router.get('/type/:class_type_id', async (req, res) => {
  try {
    const classes = await getClassesByClassType(Number(req.params.class_type_id));
    const classesInc = await unpackageClassObjects(classes);
    const classesCom = await getSpotsRemaining(classesInc);
    res.json(classesCom.sort(c => -c.start_datetime));
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a list of students that are registered in a class
router.get('/:class_id/students', async (req, res) => {
  try {
    const studentIds = await getStudentsForClass(Number(req.params.class_id)); // Get list of student ids
    const students = await getStudentList(studentIds); // Get student objects based on ids
    res.json(students);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new class into the database
router.post('/create', async (req, res) => {
  try {
    const classObj = await createClass(req.query);
    const classCom = await unpackageClassObjects([classObj]);
    res.json(classCom);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Register the logged in user for a class
router.post('/:class_id/register', async (req, res) => {
  try {
    const classStudent = await registerStudent(Number(req.params.class_id), Number(req.query.student_id)); // Change cookie to server side
    res.json(classStudent);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a registration the logged in user has for a class
router.delete('/:class_id/register', async (req, res) => {
  try {
    const classStudent = await cancelRegistration(Number(req.params.class_id), Number(req.query.student_id)); // Change cookie to server side
    res.json(classStudent);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a class from the database
router.delete('/:class_id', async (req, res) => {
  try {
    const data = await deleteClass(Number(req.params.class_id));
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
