const express = require('express');
const router = express.Router();

const { getClassesByClassType } = require('../db/queries/classQueries');
const { getSpotsRemaining } = require('../helpers/classHelpers');
const { formatDate, formatTime } = require('../helpers/operationHelpers');

router.get('/:class_type_id', async (req, res) => {
  try {
    const classListInc = await getClassesByClassType(req.params.class_type_id);
    const classListCom = await getSpotsRemaining(classListInc);
    res.render('../../client/views/pages/schedule', { classList: classListCom, formatDate, formatTime });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;