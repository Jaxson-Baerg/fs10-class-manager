const express = require('express');
const router = express.Router();

const { getClassTypes, getClassTypeById, createClassType } = require('../db/queries/classTypeQueries');

// Get all class types
router.get('/', async (req, res) => {
  try {
    const classTypes = await getClassTypes();
    res.json(classTypes);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a class type by its id
router.get('/:id', async (req, res) => {
  try {
    const classType = await getClassTypeById(Number(req.params.id));
    res.json(classType);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a class type
router.post('/create', async (req, res) => {
  try {
    const classType = await createClassType(req.query);
    res.json(classType);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;