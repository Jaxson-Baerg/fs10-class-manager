const db = require('../index');

// Get all classes with time based attributes
const getClasses = async () => {
  const data = await db.query(
      "SELECT *, (start_datetime > current_timestamp) can_register, start_datetime::text as event_date"+
      ", (start_datetime > current_timestamp + interval '12 hours') can_cancel"+
      ", (start_datetime > current_timestamp + interval '24 hours' AND start_datetime <= current_timestamp + interval '25 hours') send_reminder"+
      " FROM classes join class_types using(class_type_id)"+
      " ORDER BY start_datetime;"
    );
  return data.rows;
};

// Get a class by it's id with time based attributes
const getClassById = async (class_id) => {
  const sql = 
      "SELECT *, (start_datetime > current_timestamp) can_register"+
      ", (start_datetime > current_timestamp + interval '12 hours') can_cancel"+
      " FROM classes WHERE class_id = $1;";
  const queryDef = {
    text: sql,
    values: [class_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Get all classes by their class type id
const getClassesByClassType = async (class_type_id, student_id) => {
  let sql = "SELECT *, (start_datetime > current_timestamp) can_register, (start_datetime > current_timestamp + interval '12 hours') can_cancel";
  if (student_id > 0) {
    sql += ', (SELECT EXISTS (SELECT * FROM class_students WHERE class_id=classes.class_id AND student_id=$2)) registered';
  }
  sql += ', (classes.max_students - (SELECT count(*) FROM class_students WHERE class_id=classes.class_id)) spots_remaining';
  sql += ' FROM classes';
  sql += ' WHERE class_type_id = $1 and start_datetime >= current_date order by start_datetime';
  let queryDef = {};
  if (student_id > 0) {
    queryDef = { text: sql, values: [class_type_id, student_id] };
  }
  else {
    queryDef = { text: sql, values: [class_type_id] };
  }

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
