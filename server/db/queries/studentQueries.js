const db = require('../index');

// Generate a unique alphanumeric code
const generateUniqueCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Get all students' info except id and unique code
const getStudents = async () => {
  const data = await db.query('SELECT first_name, last_name, email, credits, customer_id FROM students;');
  return data.rows;
};

// Get a single student by its email
const getStudentByEmail = async (email) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id FROM students WHERE email = $1;',
    values: [email]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get a single student by its id
const getStudentById = async (id) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id FROM students WHERE student_id = $1;',
    values: [id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get a student's unique code by its id
const getStudentCodeById = async (id) => {
  const queryDef = {
    text: 'SELECT unique_code FROM students WHERE student_id = $1;',
    values: [id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Get a student by its unique code
const getStudentByCode = async (code) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id FROM students WHERE unique_code = $1;',
    values: [code]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
}

// Update a student's info by the parameters
const updateStudent = async (student_id, studentInfo) => {
  // Dynamically set which columns to update on the student based on the query parameters
  const setColumns = Object.keys(studentInfo).map((property, index) => `${property}=$${index + 2}`).join(', ');

  const queryDef = {
    text: `UPDATE students SET ${setColumns} WHERE student_id = $1 RETURNING *;`,
    values: [student_id, ...Object.values(studentInfo)]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Create a student by the parameters
const addStudent = async (first_name, last_name, email) => {
  const unique_code = generateUniqueCode()
  const queryDef = {
    text: `INSERT INTO students (first_name, last_name, email, unique_code, credits) VALUES ($1, $2, $3, $4, $5) RETURNING student_id, first_name, last_name, email, credits;`,
    values: [first_name, last_name, email, unique_code, 0]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

module.exports = {
  generateUniqueCode,
  getStudents,
  getStudentByEmail,
  getStudentById,
  getStudentCodeById,
  getStudentByCode,
  updateStudent,
  addStudent
};
