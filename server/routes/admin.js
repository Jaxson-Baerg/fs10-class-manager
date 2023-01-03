const express = require('express');
const router = express.Router();

require('dotenv').config();

const { getClassesByClassType, getClassById, createClass, deleteClass, updateClass } = require('../db/queries/classQueries');
const { getStudentsForClass, cancelRegistration, completeClass, getRegistrations } = require('../db/queries/classStudentQueries');
const { getClassTypes, getClassTypeById, createClassType, deleteClassType, updateClassType } = require('../db/queries/classTypeQueries');
const { updateStudent } = require('../db/queries/studentQueries');
const { getSpotsRemaining, getStudentList, getStudentsCheckedIn, unpackageClassObjects } = require('../helpers/classStudentHelpers');
const { formatDate, formatTime, updateHistory, sortClasses } = require('../helpers/operationHelpers');

// Render the admin page if the admin password has been given, with all class types
router.get('/', async (req, res) => {
  try {
    if (req.session.admin) {
      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: undefined });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render all classes in a given class type
router.get('/schedule/:class_type_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classType = await getClassTypeById(req.params.class_type_id);

      const classList = await getClassesByClassType(req.params.class_type_id);
      const classListInc = await getSpotsRemaining(classList);
      const classListCom = await sortClasses(classListInc);
      
      req.session.history = updateHistory(req.session.history, `admin/schedule/${req.params.class_type_id}`);
      res.render('../../client/views/pages/admin_schedule', { user: req.session.user, formatDate, formatTime, classList: classListCom.sort(c => c.start_datetime), classType });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render all students in a given class
router.get('/class/:class_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classObj = await getClassById(req.params.class_id);
      const classObjInc = await unpackageClassObjects([classObj]);
      const classObjCom = await getSpotsRemaining(classObjInc);

      const studentIdList = await getStudentsForClass(req.params.class_id);
      const studentObjList = await getStudentList(studentIdList);
      const completeList = await getStudentsCheckedIn(req.params.class_id, studentIdList);

      req.session.history = updateHistory(req.session.history, `admin/class/${req.params.class_id}`);
      res.render('../../client/views/pages/admin_class', { user: req.session.user, formatDate, formatTime, classObj: classObjCom[0], studentList: studentObjList, completeList });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the create class type form page
router.get('/create/class_type', async (req, res) => {
  try {
    if (req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/create/class_type');
      res.render('../../client/views/pages/admin_create_class_type', { user: req.session.user });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the submitted class type in the database and redirect to the admin home page
router.post('/create/class_type', async (req, res) => {
  try {
    if (req.session.admin) {
      await createClassType({
        name: req.body.name,
        description: req.body.description,
        item_list: [req.body.item_list_one, req.body.item_list_two, req.body.item_list_three, req.body.item_list_four, req.body.item_list_five].filter(n => n),
        image_url: req.body.image_url
      });

      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class type successfully created." });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/edit/class_type/:class_type_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classTypeObj = await getClassTypeById(req.params.class_type_id);

      req.session.history = updateHistory(req.session.history, 'admin/edit/class_type/form');
      res.render('../../client/views/pages/admin_edit_class_type', { user: req.session.user, classTypeObj });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/edit/class_type', async (req, res) => {
  try {
    res.redirect('/admin');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/edit/class_type', async (req, res) => {
  try {
    if (req.session.admin) {
      const classTypeData = {...req.body};
      delete classTypeData.class_type_id;
      await updateClassType(req.body.class_type_id, classTypeData);

      // TODO possibly email affected users?

      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class type successfully edited." });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/delete/class_type', async (req, res) => {
  try {
    res.redirect('/admin');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

//
// TODO send email to students affected?
router.post('/delete/class_type', async (req, res) => {
  try {
    if (req.session.admin) {
      let invalid = false;
      const classes = await getClassesByClassType(req.body.class_type_id);
      const deleteClassTypeDependencies = async () => {
        classes.forEach(async c => {
          const registrations = await getRegistrations(c.class_id);
          registrations.forEach(r => {
            if (r.complete) invalid = true;
          });

          if (!invalid) {
            const students = await getStudentsForClass(c.class_id);
            const studentsCom = await getStudentList(students);
            studentsCom.forEach(async s => {
              await updateStudent(s.student_id, {
                credits: s.credits + c.credit_cost
              });
              await cancelRegistration(c.class_id, s.student_id);
            });

            await deleteClass(c.class_id);
          }
        });
      };
      deleteClassTypeDependencies().then(async () => {
        if (!invalid) {
          await deleteClassType(req.body.class_type_id);
        } else {
          console.log('Found a dependant registration, aborting.');
        }
      })

      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class type successfully deleted." });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the create class form page
router.get('/create/class', async (req, res) => {
  try {
    if (req.session.admin) {
      const classTypes = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/create/class');
      res.render('../../client/views/pages/admin_create_class', { user: req.session.user, classTypes });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the submitted class type in the database and redirect to the admin home page
router.post('/create/class', async (req, res) => {
  try {
    if (req.session.admin) {
      const start_datetime = req.body.date.split('T');
      start_datetime.splice(2, 0, '-07:00').splice(1, 1, `${req.body.date.split('T')[1]}:00`);
      const end_datetime = req.body.date.split('T');
      end_datetime.splice(1, 1);
      end_datetime.push(req.body.time)
      end_datetime.push('-07:00');

      await createClass({
        class_type_id: req.body.type,
        start_datetime: start_datetime.join(' '),
        end_datetime: end_datetime.join(' '),
        credit_cost: req.body.credit,
        max_students: req.body.student
      });

      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class successfully created." });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/edit/class/:class_id', async (req, res) => {
  try {
    if (req.session.admin) {
      const classObjInc = await getClassById(req.params.class_id);
      const classObjCom = await unpackageClassObjects([classObjInc]);

      req.session.history = updateHistory(req.session.history, 'admin/edit/class/form');
      res.render('../../client/views/pages/admin_edit_class', { user: req.session.user, formatDate, formatTime, classObj: classObjCom[0] });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/edit/class', async (req, res) => {
  try {
    res.redirect('/admin');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/edit/class', async (req, res) => {
  try {
    if (req.session.admin) {
      const start_datetime = req.body.date.split('T');
      start_datetime.splice(2, 0, '-07:00').splice(1, 1, `${req.body.date.split('T')[1]}:00`);
      const end_datetime = req.body.date.split('T');
      end_datetime.splice(1, 1);
      end_datetime.push(req.body.time)
      end_datetime.push('-07:00');

      await updateClass(req.body.class_id, {
        start_datetime: start_datetime.join(' '),
        end_datetime: end_datetime.join(' '),
        credit_cost: req.body.credit,
        max_students: req.body.student
      });

      // TODO possibly email affected users?

      const typeList = await getClassTypes();

      req.session.history = updateHistory(req.session.history, 'admin/');
      res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class successfully modified." });
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/delete/class', async (req, res) => {
  try {
    res.redirect('/admin');
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

//
// TODO email affected students?
router.post('/delete/class', async (req, res) => {
  try {
    if (req.session.admin) {
      const classObj = await getClassById(req.body.class_id);

      let invalid = false;
      const registrations = await getRegistrations(req.body.class_id);
      registrations.forEach(r => {
        if (r.complete) invalid = true;
      });
      if (!invalid) { 
        const students = await getStudentsForClass(req.body.class_id);
        const studentsCom = await getStudentList(students);

        studentsCom.forEach(async s => {
          await updateStudent(s.student_id, {
            credits: s.credits + classObj.credit_cost
          });
          await cancelRegistration(req.body.class_id, s.student_id);
        });

        await deleteClass(req.body.class_id);

        const typeList = await getClassTypes();

        req.session.history = updateHistory(req.session.history, 'admin/');
        res.render('../../client/views/pages/admin', { user: req.session.user, typeList, message: "Class successfully deleted." });
      } else {
        console.log('Found a dependant registration, aborting.');
        res.redirect('/admin');
      }
    } else {
      res.redirect('/admin/login');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Check-in a student into a class (change classstudent complete column to true)
router.post('/checkin/', async (req, res) => {
  try {
    await completeClass(req.body.class_id, req.body.student_id);

    res.redirect(`/admin/class/${req.body.class_id}`);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a student's registration for a class
router.post('/cancel', async (req, res) => {
  try {
    await cancelRegistration(req.body.class_id, req.body.student_id);

    res.redirect(`/admin/class/${req.body.class_id}`);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Render the admin login page to enter the password stored in the .env file
router.get('/login', async (req, res) => {
  try {
    if (!req.session.admin) {
      req.session.history = updateHistory(req.session.history, 'admin/login');
      res.render('../../client/views/pages/admin_login', { user: req.session.user, message: undefined });
    } else {
      res.redirect('/admin');
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create the admin session cookie
router.post('/login', async (req, res) => {
  try {
    if (req.body.password === process.env.ADMIN_PASS) {
      req.session.admin = true;
      res.redirect('/admin');
    } else {
      req.session.history = updateHistory(req.session.history, 'admin/login');
      res.render('../../client/views/pages/admin_login', { user: req.session.user, message: "Password incorrect."})
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});



// Email all students in a given class
router.post('/email', async (req, res) => {
  try {

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;