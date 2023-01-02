const db = require('../index');

// Get all class types
const getClassTypes = async () => {
  const data = await db.query('SELECT * FROM class_types;');
  return data.rows;
};

// Get a single class type by its id
const getClassTypeById = async (class_type_id) => {
  const queryDef = {
    text: 'SELECT * FROM class_types WHERE class_type_id = $1;',
    values: [class_type_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

// Create a class type from the parameters
const createClassType = async ({ name, description, image_url }) => {
  const queryDef = {
    text: 'INSERT INTO class_types (name, description, image_url) VALUES ($1, $2, $3) RETURNING *;',
    values: [name, description, image_url]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

const updateClassType = async (class_type_id, classTypeInfo) => {
  // Dynamically set which columns to update on the class_type based on the query parameters
  const setColumns = Object.keys(classTypeInfo).map((property, index) => `${property}=$${index + 2}`).join(', ');

  const queryDef = {
    text: `UPDATE class_types SET ${setColumns} WHERE class_type_id = $1 RETURNING *;`,
    values: [class_type_id, ...Object.values(classTypeInfo)]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

const deleteClassType = async (class_type_id) => {
  const queryDef = {
    text: 'DELETE from class_types WHERE class_type_id = $1 RETURNING *;',
    values: [class_type_id]
  };

  const data = await db.query(queryDef);
  return data.rows[0];
};

module.exports = {
  getClassTypes,
  getClassTypeById,
  createClassType,
  updateClassType,
  deleteClassType
};
