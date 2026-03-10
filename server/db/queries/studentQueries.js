const db = require('../index');

// Generate a unique alphanumeric code
const generateUniqueCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Get all students' info except id and unique code
const getStudents = async () => {
  const data = await db.query("SELECT student_id, first_name, last_name, email, credits, mailing_list, to_char(waiver_signed_at at time zone 'America/Edmonton', 'YYYY-MM-DD HH24:MI') waiver_signed_at, customer_id FROM students;");
  return data.rows;
};

// Get a single student by its email
const getStudentByEmail = async (email) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id, unique_code FROM students WHERE email = $1;',
    values: [email]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get a single student by its id
const getStudentById = async (id) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id, mailing_list, waiver_signed_at FROM students WHERE student_id = $1;',
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

// Get a student by its stripe customer id
const getStudentByStripeId = async (customer_id) => {
  const queryDef = {
    text: 'SELECT student_id, first_name, last_name, email, credits, customer_id FROM students WHERE customer_id = $1;',
    values: [customer_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Update a student's info by the parameters
const updateStudent = async (student_id, studentInfo) => {
  // Dynamically set which columns to update on the student based on the query parameters
  const setColumns = Object.keys(studentInfo).map((property, index) => `${property}=$${index + 2}`).join(', ');

  const queryDef = {
    text: `UPDATE students SET ${setColumns} WHERE student_id = $1 RETURNING *;`,
    values: [student_id, ...Object.values(studentInfo)]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Update a student's waiver information
const updateStudentWaiver = async (student_id, waiver_name) => {
  const queryDef = `UPDATE students SET waiver_signed_at=current_timestamp,waiver_signed_name='${waiver_name}' WHERE student_id=${student_id} RETURNING *;`;

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Add/Remove credits
const changeStudentCredits = async (student_id, credits, description) => {
  const queryDef = {
    text: `SELECT record_student_credit_change($1, $2, $3);`,
    values: [student_id, credits, description]
  };
  await db.query(queryDef);
  return;
};

// Create a student by the parameters
const addStudent = async (first_name, last_name, email, mailing_list) => {
  const unique_code = generateUniqueCode();
  const queryDef = {
    text: `INSERT INTO students (first_name, last_name, email, unique_code, credits, mailing_list) VALUES ($1, $2, $3, $4, $5, $6) RETURNING student_id, first_name, last_name, email, credits, mailing_list;`,
    values: [first_name, last_name, email, unique_code, 0, mailing_list]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get credit audit entries for a student
const getStudentCreditAudit = async (student_id) => {
  const queryDef = {
    text: `
      SELECT
        audit_id,
        student_id,
        credits_before,
        credits_after,
        delta,
        description,
        to_char(changed_at at time zone 'America/Edmonton', 'YYYY-MM-DD HH24:MI') AS changed_at
      FROM student_credits_audit
      WHERE student_id = $1
      ORDER BY changed_at DESC, audit_id DESC;
    `,
    values: [student_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

module.exports = {
  generateUniqueCode,
  getStudents,
  getStudentByEmail,
  getStudentById,
  getStudentCodeById,
  getStudentByCode,
  getStudentByStripeId,
  getStudentCreditAudit,
  updateStudent,
  updateStudentWaiver,
  changeStudentCredits,
  addStudent,
};
