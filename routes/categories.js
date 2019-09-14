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

// getting assignee categories
router.get("/assignee/:id", authAssignee, async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.params._id });

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
    parentCategory: req.body.parentCategory,
    hasChild: false
  });

  if (req.body.parentCategory) {
    const category = await Category.findByIdAndUpdate(
      req.body.parentCategory,
      { hasChild: true },
      { new: true }
    );

    if (!category) return res.status(400).send("Parent category not found");
    console.log(category);
  }
  await category.save();
  res.send(category);
});

// getting category which has specific parent
router.get("/specific/parent/:id", async (req, res) => {
  const category = await Category.findOne({ parentCategory: req.params.id });

  if (!category)
    return res
      .status(404)
      .send("The category with the given Parent ID was not found.");

  res.send(category);
});

// getting root categories
router.get("/specific/noparent", async (req, res) => {
  const categories = await Category.find({ parentCategory: { $eq: null } });
  if (!categories) return res.status(404).send("No Categories found.");
  console.log(categories);
  res.send(categories);
});

// getting root categories
router.put("/:id", async (req, res) => {
  // const { error } = validate(req.body);
  // if (error) return res.status(400).send(error.details[0].message);
  //finde category
  let category = await Category.findOne({ _id: req.params.id });
  if (!category)
    return res.status(404).send("No Category with given Id found.");

  //check if the name is different then confirm its not already present
  if (category.name !== req.body.name) {
    console.log("Names ARE DIFFERENT");
    category = await Category.findOne({ name: req.body.name });
    if (category)
      return res.status(400).send("Category with given name is already exists");
  }
  //check for valid parent category
  if (req.body.parentCategory) {
    if (req.body.parentCategory === req.params.id) {
      return res.status(400).send("category cannot be its own Parent.");
    }

    category = await Category.findOneAndUpdate(
      { _id: req.body.parentCategory },
      { hasChild: true },
      { new: true }
    );
    if (!category) return res.status(400).send("Parent Category doesnot exist");
  } else {
    //make the category child of root
  }

  //then update it
  category = await Category.replaceOne({ _id: req.params.id }, req.body, {
    new: true
  });

  if (!category)
    return res.status(404).send("No Category with given Id found.");

  res.send(category);
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
  const categories = await Category.findOne({ _id: req.params.id });

  if (!categories) return res.status(404).send("No Category found");

  res.send(categories);
});

//categories' siblings
router.get("/siblingsOf/:id", async (req, res) => {
  console.log("Requested id", req.params.id);
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).send("No such category found");
  const siblings = await Category.find({
    parentCategory: category.parentCategory
  });

  res.send(siblings);
});

//categories' Childs
router.get("/childsOf/:id", async (req, res) => {
  const childs = await Category.find({ parentCategory: req.params.id });
  if (!childs) return res.status(404).send("No childs of this category");

  res.send(childs);
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
