const db = require('../index');

const getRegistrations = async (class_id) => {
  const queryDef = {
    text: 'SELECT * FROM class_students WHERE class_id = $1',
    values: [class_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Get all the classes by the student id that is registered for them
const getClassesForStudent = async (student_id) => {
  const queryDef = {
    text: 'SELECT class_id FROM class_students JOIN classes USING(class_id) WHERE student_id = $1 AND start_datetime >= current_date;',
    values: [student_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Get all the students by the class id that are registered in it
const getStudentsForClass = async (class_id) => {
  const queryDef = {
    text: 'SELECT students.* FROM class_students join students using (student_id) WHERE class_id = $1;',
    values: [class_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

const getComplete = async (class_id, student_id) => {
  const queryDef = {
    text: 'SELECT complete FROM class_students WHERE class_id = $1 AND student_id = $2;',
    values: [class_id, student_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0].complete;
};

const getCompletedClasses = async (student_id) => {
  const queryDef = {
    text: 'SELECT COUNT(*) FROM class_students WHERE student_id = $1 AND complete = true;',
    values: [student_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0].count;
};

// Change a class to 'complete'
const completeClass = async (class_id, student_id) => {
  const queryDef = {
    text: 'UPDATE class_students SET complete = true WHERE class_id = $1 AND student_id=$2 RETURNING *;',
    values: [class_id, student_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Register a student into a class
const registerStudent = async (class_id, student_id) => {
  const queryDef = {
    text: 'INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) RETURNING *;',
    values: [class_id, student_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Cancel a student's registration in a class
const cancelRegistration = async (class_id, student_id) => {
  const queryDef = {
    text: 'DELETE FROM class_students WHERE class_id = $1 AND student_id = $2 RETURNING *;',
    values: [class_id, student_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

module.exports = {
  getRegistrations,
  getClassesForStudent,
  getStudentsForClass,
  getComplete,
  getCompletedClasses,
  completeClass,
  registerStudent,
  cancelRegistration
};
