const { getClassById } = require('../db/queries/classQueries');
const { getStudentById } = require('../db/queries/studentQueries');
const { getClassTypeById } = require('../db/queries/classTypeQueries');
const { getStudentsForClass, getComplete } = require('../db/queries/classStudentQueries');

// Get class objects from list of class ids
const getClassList = async (classIds) => {
  const classes = [];
  for (classId of classIds) {
    const classList = await getClassById(Number(classId.class_id));
    classes.push(classList);
  }
  return classes;
};

// Get student objects from list of student ids
const getStudentList = async (studentIds) => {
  const students = [];
  for (studentId of studentIds) {
    const studentList = await getStudentById(Number(studentId.student_id));
    students.push(studentList);
  }
  return students;
};

// Append class type data with class data
const unpackageClassObjects = async (classList) => {
  const classes = [];
  for (let c of classList) {
    const classType = await getClassTypeById(c.class_type_id);

    c = {
      ...c,
      name: classType.name,
      description: classType.description,
      item_list: classType.item_list,
      image_url: classType.image_url
    };
    classes.push(c);
  };
  return classes;
}

// Calculate spots remaining for each class
const getSpotsRemaining = async (classList) => {
  const classes = [];
  for (let c of classList) {
    const numStudents = await getStudentsForClass(c.class_id);
    classes.push({
      ...c,
      spots_remaining: c.max_students - numStudents.length
    });
  }
  return classes;
};

const getStudentsCheckedIn = async (class_id, studentList) => {
  const list = {};
  for (let s of studentList) {
    const complete = await getComplete(class_id, s.student_id);
    list[s.student_id] = complete;
  }
  return list;
}

module.exports = { getClassList, getStudentList, unpackageClassObjects, getSpotsRemaining, getStudentsCheckedIn };