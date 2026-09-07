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

const registerStudentForClassWithCredits = async (class_id, student_id) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const classResult = await client.query({
      text: `
        SELECT
          class_id,
          credit_cost,
          max_students,
          (
            SELECT COUNT(*)
            FROM class_students
            WHERE class_id = classes.class_id
          )::int AS registered_count
        FROM classes
        WHERE class_id = $1
          AND start_datetime > current_timestamp
        FOR UPDATE;
      `,
      values: [class_id]
    });

    const classObj = classResult.rows[0];

    if (!classObj) {
      await client.query('ROLLBACK');
      return { status: 'unavailable' };
    }

    if (classObj.registered_count >= classObj.max_students) {
      await client.query('ROLLBACK');
      return { status: 'full' };
    }

    const studentResult = await client.query({
      text: 'SELECT credits FROM students WHERE student_id = $1 FOR UPDATE;',
      values: [student_id]
    });

    const student = studentResult.rows[0];

    if (!student) {
      await client.query('ROLLBACK');
      return { status: 'student_not_found' };
    }

    if (student.credits < classObj.credit_cost) {
      await client.query('ROLLBACK');
      return {
        status: 'insufficient_credits',
        creditCost: Number(classObj.credit_cost),
        creditsAvailable: Number(student.credits),
        creditsNeeded: Number(classObj.credit_cost) - Number(student.credits)
      };
    }

    const insertResult = await client.query({
      text: `
        INSERT INTO class_students (class_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT (class_id, student_id) DO NOTHING
        RETURNING *;
      `,
      values: [class_id, student_id]
    });

    if (insertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { status: 'already_registered' };
    }

    await client.query({
      text: 'SELECT record_student_credit_change($1, $2, $3);',
      values: [student_id, Number(classObj.credit_cost) * -1, 'Class Registration']
    });

    await client.query('COMMIT');

    return {
      status: 'registered',
      classId: Number(classObj.class_id),
      creditCost: Number(classObj.credit_cost)
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const registerStudentForRetreatWithCredits = async (class_ids, student_id) => {
  const client = await db.connect();
  const uniqueClassIds = [...new Set(class_ids.map(id => Number(id)).filter(Boolean))];

  try {
    await client.query('BEGIN');

    if (uniqueClassIds.length === 0) {
      await client.query('ROLLBACK');
      return { status: 'unavailable' };
    }

    const classResult = await client.query({
      text: `
        SELECT
          class_id,
          credit_cost,
          max_students,
          (
            SELECT COUNT(*)
            FROM class_students
            WHERE class_id = classes.class_id
          )::int AS registered_count
        FROM classes
        WHERE class_id = ANY($1::int[])
          AND start_datetime > current_timestamp
        ORDER BY class_id
        FOR UPDATE;
      `,
      values: [uniqueClassIds]
    });

    if (classResult.rows.length !== uniqueClassIds.length) {
      await client.query('ROLLBACK');
      return { status: 'unavailable' };
    }

    const fullClass = classResult.rows.find(c => c.registered_count >= c.max_students);

    if (fullClass) {
      await client.query('ROLLBACK');
      return { status: 'full', classId: Number(fullClass.class_id) };
    }

    const totalCredits = classResult.rows.reduce((sum, c) => sum + Number(c.credit_cost), 0);

    const studentResult = await client.query({
      text: 'SELECT credits FROM students WHERE student_id = $1 FOR UPDATE;',
      values: [student_id]
    });

    const student = studentResult.rows[0];

    if (!student) {
      await client.query('ROLLBACK');
      return { status: 'student_not_found' };
    }

    if (student.credits < totalCredits) {
      await client.query('ROLLBACK');
      return {
        status: 'insufficient_credits',
        creditCost: totalCredits,
        creditsAvailable: Number(student.credits),
        creditsNeeded: totalCredits - Number(student.credits)
      };
    }

    const insertResult = await client.query({
      text: `
        INSERT INTO class_students (class_id, student_id)
        SELECT unnest($1::int[]), $2
        ON CONFLICT (class_id, student_id) DO NOTHING
        RETURNING class_id;
      `,
      values: [uniqueClassIds, student_id]
    });

    if (insertResult.rows.length !== uniqueClassIds.length) {
      await client.query('ROLLBACK');
      return { status: 'already_registered' };
    }

    await client.query({
      text: 'SELECT record_student_credit_change($1, $2, $3);',
      values: [student_id, totalCredits * -1, 'Retreat Registration']
    });

    await client.query('COMMIT');

    return {
      status: 'registered',
      classIds: uniqueClassIds,
      creditCost: totalCredits
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getRegistrations,
  getClassesForStudent,
  getStudentsForClass,
  getComplete,
  getCompletedClasses,
  completeClass,
  registerStudent,
  registerStudentForClassWithCredits,
  registerStudentForRetreatWithCredits,
  cancelRegistration
};
