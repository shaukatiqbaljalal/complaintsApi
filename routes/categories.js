const { Category, validate } = require("../models/category");
const { Assignee } = require("../models/assignee");
const { categorySelection } = require("../utils/categorySelection");
const authUser = require("./../middleware/authUser");

const authAssignee = require("../middleware/authAssignee");
const express = require("express");
const router = express.Router();
const _ = require("lodash");

// getting assignee categories
router.get("/assignee/allCategories/all", authAssignee, async (req, res) => {
  // const assignee = await Assignee.findOne({ _id: req.assignee._id });
  // const categories = await Category.find({ _id: assignee.responsibilities._id });

  const assignee = await Assignee.findOne({ _id: req.assignee._id });

  res.status(200).send(assignee.responsibilities);
});

// getting assignee categories
router.get("/assignee/:id", authAssignee, async (req, res) => {
  const assignee = await Assignee.findOne({ _id: req.params._id });

  const categories = await Category.find({
    _id: "assignee.responsibilities._id"
  });

  res.status(200).send(categories);
});

router.get("/all", authAssignee, async (req, res) => {
  const categories = await Category.find({ companyId: req.assignee.companyId });
  if (!categories.length) return res.status(404).send("Categories not found");
  res.send(categories);
});

router.get("/root/category", async (req, res) => {
  const category = await Category.findOne({ name: "root", companyId: null });
  console.log(category);
  if (!category) return res.status(404).send("Category named root not found");
  res.send(category);
});
//categories' Childs
router.get("/childsOf/:id", async (req, res) => {
  const childs = await childsOf(req.params.id);
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
router.get("/specific/noparent", authUser, async (req, res) => {
  const categories = await Category.find({
    parentCategory: { $eq: null },
    companyId: req.user.companyId
  });
  if (!categories) return res.status(404).send("No Categories found.");
  res.send(categories);
});

// getting parent category
router.get("/find/parent/category/:id", async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id });

  if (!category)
    return res.status(404).send("Category with given id not found");

  res.send(category);
});

//categories' siblings
router.get("/siblingsOf/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).send("No such category found");
  const siblings = await Category.find({
    parentCategory: category.parentCategory,
    companyId: category.companyId
  });

  res.send(siblings);
});

async function childsOf(id) {
  let childs = await Category.find({ parentCategory: id });
  return childs;
}

async function _findCategoryById(id) {
  let category = await Category.findById(id);
  return category;
}

async function toggleHasChild(id) {
  let category = await _findCategoryById(id);
  if (category) {
    console.log("Parent category Got", category);
    category.hasChild = !category.hasChild;
    try {
      return await category.save();
    } catch (error) {
      console.log("error in toggle has child", error);
    }
  }
}

// creating categories
router.post("/", authUser, async (req, res) => {
  req.body.companyId = req.user.companyId;
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //Front end pay implementation is tarah ki hai k drop and down walay part main jab main root categories ka
  //sibling banata hun tou parent id null hoti hai q k root cats ka koi parent ni
  //tou database main hamesha aik root category rahay gi jis ki id compare ki jae
  //if it is equal then make the category root of company of req.user.companyId

  let rootCategory = await Category.findOne({ name: "root", companyId: null });

  if (req.body.parentCategory && req.body.parentCategory == rootCategory._id) {
    console.log("Ids equal");
    req.body.parentCategory = null;
  }
  let siblingsList,
    parentCategory = null;
  //check is there parent category which is specified
  if (req.body.parentCategory) {
    console.log("inside");
    parentCategory = await _findCategoryById(req.body.parentCategory);
    if (!parentCategory)
      return res.status(400).send("No such parent Category found.");
    if (parentCategory.name === req.body.name)
      return res.status(400).send("Child can not have same name as parent");

    //validate no same categories in certain branch of categories tree
    if (parentCategory.hasChild) {
      siblingsList = await childsOf(req.body.parentCategory);
      let matchedCategory = siblingsList.find(c => c.name === req.body.name);
      if (matchedCategory)
        return res.status(400).send("Category already found.");
    }
  } else {
    let category = await Category.findOne({
      parentCategory: null,
      name: req.body.name,
      companyId: req.body.companyId
    });
    if (category) return res.status(400).send("Category Already Exists");
  }
  //find childs of parentCategory

  let category = new Category(req.body);

  try {
    await category.save();
    res.send(category);
    //update has child of parent of new category
    if (parentCategory && !parentCategory.hasChild) {
      const updatedParentCategory = await toggleHasChild(parentCategory._id);
      console.log("Updated Parent Category", updatedParentCategory);
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

async function isUnique(name, parentCategory) {
  let siblingsList = null;

  //validate no same categories in certain branch of categories tree
  if (parentCategory.hasChild) {
    siblingsList = await childsOf(parentCategory._id);
    if (siblingsList.find(c => c.name === name)) return false;
  }
  return true;
}

router.post("/bulk", async (req, res) => {
  console.log(req.body.categories);

  let categories = req.body.categories;
  if (categories.length < 0)
    return res.status(400).send("No categories in the body");
  let ids = [];
  let docs = [];
  let index = categories.findIndex(c => c.name === "General");
  if (index >= 0) categories.splice(index, 1);
  //if there is no category in DB
  let categoriesInDb = await Category.find({ companyId: req.body.companyId });
  let generaIndex = categoriesInDb.findIndex(
    c => c.name === "General" && !c.parentCategory
  );

  if (generaIndex < 0) {
    categories.push({
      id: categories.length + 1,
      name: "General",
      hasChild: false,
      companyId: req.body.companyId
    });
  }
  // List<Category> documents= new ArrayList();
  categories.forEach(category => {
    let oldId = category._id;
    delete category._id;
    if (category.parentCategory) {
      let newParentCategory = ids.find(
        obj => obj.oldId == category.parentCategory
      ).newId;
      category.parentCategory = newParentCategory;
    }
    if (!category.companyId) category.companyId = req.body.companyId;
    let persistentCategory = new Category(category);
    ids.push({ oldId: oldId, newId: persistentCategory._id });
    docs.push(persistentCategory);
  });
  console.log(ids);
  console.log(docs);
  Category.collection.insertMany(docs, (err, result) => {
    if (err) res.status(400).send(err);
    else {
      console.log(result);
      res.status(200).send("Successful");
    }
  });
});

router.put("/updatebulk", authUser, async (req, res) => {
  let errors = [];
  if (!req.body.categories) return res.status(400).send("No category provided");
  let { categories } = req.body;
  console.log(categories);
  categories.forEach(async category => {
    if (!category.companyId) category.companyId = req.user.companyId;

    let id = category._id;
    delete category._id;
    try {
      await Category.findByIdAndUpdate({ _id: id }, category);
    } catch (error) {
      // return res.status(500).send("Could not perform the task" + error);
      errors.push(error);
    }
  });
  if (errors.length < 1) {
    return res.status(200).send("Successfully Updated");
  } else {
    console.log(errors);
    return res.status(400).send({ err: errors });
  }
});

router.put("/:id", async (req, res) => {
  if (!req.body.companyId) req.body.companyId = req.user.companyId;
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  //find category
  let category = await Category.findOne({ _id: req.params.id });
  if (!category)
    return res.status(404).send("No Category with given Id found.");

  //find parent category
  let parentCategory = null;
  if (req.body.parentCategory)
    parentCategory = await _findCategoryById(req.body.parentCategory);

  //check if the name is different then confirm its not already present
  if (category.name !== req.body.name) {
    let isUniqueName = await isUnique(parentCategory, req.body.name);
    if (!isUniqueName) {
      return res.status(400).send("Category with given name is already exists");
    }
  }
  //check if parent is being changed
  if (
    category.parentCategory &&
    category.parentCategory != req.body.parentCategory
  ) {
    //check old parent has more than 2 childs
    let childs = await childsOf(category.parentCategory);
    if (childs.length <= 2) {
      let oldParent = await toggleHasChild(category.parentCategory);
      console.log("Old parent", oldParent);
    }
  }
  //check for valid parent category
  if (req.body.parentCategory && req.body.parentCategory === req.params.id) {
    return res.status(400).send("category cannot be its own Parent.");
  }

  //then update it
  try {
    category = await Category.findByIdAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true
      }
    );
    let updatedParentCategory = parentCategory;
    if (!parentCategory.hasChild) {
      updatedParentCategory = await toggleHasChild(parentCategory._id);
      console.log("Updated Parent Category", updatedParentCategory);
    }
    res.send({ category: category, parent: updatedParentCategory });
  } catch (error) {
    console.log("Error while updating", error);
  }
});

// for sentiment analysis
router.post("/sentiment/selection", authUser, async (req, res) => {
  console.log(req.body);
  const cat = categorySelection(req.body.details);
  const category = await Category.findOne({
    name: cat,
    companyId: req.user.companyId
  });

  if (!category) {
    return res.status(404).send("No Category found");
  }
  res.send(category);
});

router.delete("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(400).send("Category Not found");
  if (!category.hasChild) {
    //make has child false of the parent of deleting catg if no child left
    if (category.parentCategory) {
      let childs = await childsOf(category.parentCategory);
      if (childs.length === 1) {
        await toggleHasChild(category.parentCategory);
      }
    }
    try {
      await Category.findOneAndRemove({ _id: req.params.id });
      return res.send(category);
    } catch (error) {
      return res.send(error);
    }
  }
  return res.status(400).send("You cannot delete this category");
});

module.exports = router;
