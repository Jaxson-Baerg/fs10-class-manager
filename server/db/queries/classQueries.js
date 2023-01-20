const db = require('../index');

// Get all classes with time from present until the class appended
const getClasses = async () => {
  const data = await db.query('SELECT *, start_datetime - NOW() AS time_to_class FROM classes join class_types using(class_type_id);');
  return data.rows;
};

// Get a class by it's id with time from present until the class appended
const getClassById = async (class_id) => {
  const queryDef = {
    text: 'SELECT *, start_datetime - NOW() AS time_to_class FROM classes WHERE class_id = $1;',
    values: [class_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get all classes by their class type id
const getClassesByClassType = async (class_type_id) => {
  const queryDef = {
    text: 'SELECT *, start_datetime - NOW() AS time_to_class FROM classes WHERE class_type_id = $1;',
    values: [class_type_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

// Create a class from parameters
const createClass = async ({ class_type_id, start_datetime, end_datetime, credit_cost, max_students }) => {
  const queryDef = {
    text: `INSERT INTO classes (class_type_id, start_datetime, end_datetime, credit_cost, max_students) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
    values: [class_type_id, start_datetime, end_datetime, credit_cost, max_students]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

const updateClass = async (class_id, classInfo) => {
  // Dynamically set which columns to update on the class_type based on the query parameters
  const setColumns = Object.keys(classInfo).map((property, index) => `${property}=$${index + 2}`).join(', ');

  const queryDef = {
    text: `UPDATE classes SET ${setColumns} WHERE class_id = $1 RETURNING *;`,
    values: [class_id, ...Object.values(classInfo)]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Delete a class by it's id
const deleteClass = async (class_id) => {
  const queryDef = {
    text: 'DELETE FROM classes WHERE class_id = $1 RETURNING *;',
    values: [class_id]
  };

  const data = await db.query(queryDef);
  return data.rows;
};

module.exports = {
  getClasses,
  getClassById,
  getClassesByClassType,
  createClass,
  updateClass,
  deleteClass
};
