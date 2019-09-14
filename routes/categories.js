const { Category, validate } = require("../models/category");
const { Assignee } = require("../models/assignee");
const { categorySelection } = require("../utils/categorySelection");
const authAssignee = require("../middleware/authAssignee");
const express = require("express");
const router = express.Router();

// getting assignee categories
router.get("/assignee", authAssignee, async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.assignee._id });

  const categories = await Category.find({ _id: assignee.responsibility });

  res.status(200).send(categories);
});

router.get("/all", async (req, res) => {
  const categories = await Category.find();
  res.send(categories);
});

// creating categories
router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let category = await Category.findOne({ name: req.body.name });
  if (category) return res.status(400).send("Category already found.");

  category = new Category({
    name: req.body.name,
    parentCategory: req.body.parentCategory
  });

  await category.save();
  res.send(category);
});

// getting category which has specific parent
router.get("/specific/parent/:id", async (req, res) => {
  const category = await Category.find({ parentCategory: req.params.id });

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

// getting specific categories
router.get("/specific/noparent", async (req, res) => {
  const categories = await Category.find({ parentCategory: { $eq: null } });
  if (!categories) return res.status(404).send("No Categories found.");

  res.send(categories);
});

// for sentiment analysis
router.post("/sentiment/selection", async (req, res) => {
  console.log(req.body);
  const cat = categorySelection(req.body.details);
  const category = await Category.findOne({ name: cat });

  if (!category) {
    return res.status(404).send("No Category found");
  }
  res.send(category);
});

// getting parent category
router.get("/find/parent/category/:id", async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id });

  if (!category) return res.status(404).send("No Category found");

  res.send(category);
});

// getting one category detail
router.get("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID was not found.");

  res.send(category);
});

module.exports = router;
