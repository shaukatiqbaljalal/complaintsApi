const { Admin, validate } = require('../models/admin');
const { Category } = require('../models/category');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const _ = require('lodash');

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let admin = await Admin.findOne({ email: req.body.email });
  if (admin) return res.status(400).send('User already registered.');

  for (i = 0; i < req.body.responsibility.length; i++) {
    let category = await Category.findOne({ _id: req.body.responsibility[i] });
    if (!category) return res.status(400).send('Invalid Category.');
  }

  admin = new Admin({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    responsibility: req.body.responsibility
  });

  const salt = await bcrypt.genSalt(10);
  admin.password = await bcrypt.hash(admin.password, salt);

  await admin.save();
  res.send(_.pick(admin, ['_id', 'name', 'email']));
});

module.exports = router;

// /api/complainers
