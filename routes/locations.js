const { Location, validate } = require("../models/location");
const { Assignee } = require("../models/assignee");
// const { categorySelection } = require("../utils/categorySelection");
const authUser = require("./../middleware/authUser");
const authAssignee = require("../middleware/authAssignee");
const express = require("express");
const router = express.Router();
const _ = require("lodash");

// // getting assignee categories
// router.get("/assignee/allCategories/all", authAssignee, async (req, res) => {
//   // const assignee = await Assignee.findOne({ _id: req.assignee._id });
//   // const categories = await Category.find({ _id: assignee.responsibilities._id });

//   const assignee = await Assignee.findOne({ _id: req.assignee._id });

//   res.status(200).send(assignee.responsibilities);
// });

// // getting assignee categories
// router.get("/assignee/:id", authAssignee, async (req, res) => {
//   const assignee = await Assignee.findOne({ _id: req.params._id });
//   const categories = await Category.find({
//     _id: "assignee.responsibilities._id"
//   });
//   res.status(200).send(categories);
// });

router.get("/all", authUser, async (req, res) => {
  //   const categories = await Location.find({ companyId: req.assignee.companyId });
  const locations = await Location.find({ companyId: req.assignee.companyId });

  if (!locations.length) return res.status(404).send("Locations not found");
  res.send(locations);
});

router.get("/root/location", async (req, res) => {
  const location = await Location.findOne({ name: "root", companyId: null });
  console.log(location);
  if (!location) return res.status(404).send("Location named root not found");
  res.send(location);
});

//locations' Childs
router.get("/childsOf/:id", async (req, res) => {
  const childs = await childsOf(req.params.id);
  if (!childs) return res.status(404).send("No childs of this location");
  res.send(childs);
});

// getting one category detail
router.get("/:id", async (req, res) => {
  const location = await Location.findById(req.params.id);

  if (!location)
    return res
      .status(404)
      .send("The location with the given ID was not found.");

  res.send(location);
});

// getting category which has specific parent
router.get("/specific/parent/:id", async (req, res) => {
  const location = await Location.findOne({ parentLocation: req.params.id });

  if (!location)
    return res
      .status(404)
      .send("The location with the given Parent ID was not found.");

  res.send(location);
});

// getting root categories
router.get("/specific/noparent", authUser, async (req, res) => {
  const locations = await Location.find({
    parentLocation: { $eq: null },
    companyId: req.user.companyId
  });
  if (!locations) return res.status(404).send("No Locations found.");
  res.send(locations);
});

// getting parent category
router.get("/find/parent/location/:id", async (req, res) => {
  const location = await Location.findOne({ _id: req.params.id });

  if (!location)
    return res.status(404).send("Location with given id not found");

  res.send(location);
});

router.get("/fullpath/:locationId", authUser, async (req, res) => {
  let arr = [];
  let location = await Location.findById(req.params.locationId);
  if (!location)
    return res.status(400).send("Location with given id not found.");
  arr.push(location);
  while (location.parentLocation) {
    location = await Location.findById({ _id: location.parentLocation });
    arr.unshift(location);
  }
  return res.status(200).send(arr);
});

router.post("/get/multiplePaths", authUser, async (req, res) => {
  let fullpaths = [];
  let { responsibilities } = req.body;
  console.log(req.body.responsibilities);
  for (let index = 0; index < responsibilities.length; index++) {
    let path = [];
    const responsibility = responsibilities[index];
    let location = await Location.findById(responsibility._id);
    if (!location)
      return res
        .status(400)
        .send("Location with given id not found. " + responsibility._id);
    path.push(location);
    while (location.parentLocation) {
      location = await Location.findById({ _id: location.parentLocation });
      path.unshift(location);
    }
    fullpaths.push(path);
  }

  return res.status(200).send(fullpaths);
});

//categories' siblings
router.get("/siblingsOf/:id", async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).send("No such Location found");
  const siblings = await Location.find({
    parentLocation: location.parentLocation,
    companyId: location.companyId
  });

  res.send(siblings);
});

async function childsOf(id) {
  let childs = await Location.find({ parentLocation: id });
  return childs;
}

async function _findLocationById(id) {
  let location = await Location.findById(id);
  return location;
}

async function toggleHasChild(id) {
  let location = await _findLocationById(id);
  if (location) {
    console.log("Parent Location Got", location);
    location.hasChild = !location.hasChild;
    try {
      return await location.save();
    } catch (error) {
      console.log("error in toggle has child", error);
    }
  }
}

// creating locations
router.post("/", authUser, async (req, res) => {
  req.body.companyId = req.user.companyId;
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //Front end pay implementation is tarah ki hai k drop and down walay part main jab main root categories ka
  //sibling banata hun tou parent id null hoti hai q k root cats ka koi parent ni
  //tou database main hamesha aik root category rahay gi jis ki id compare ki jae
  //if it is equal then make the category root of company of req.user.companyId

  let rootLocation = await Location.findOne({ name: "root", companyId: null });
  console.log("rootLocation", rootLocation);

  if (req.body.parentLocation && req.body.parentLocation == rootLocation._id) {
    console.log("Ids equal");
    req.body.parentLocation = null;
  }
  let siblingsList,
    parentLocation = null;
  //check is there parent category which is specified
  if (req.body.parentLocation) {
    console.log("inside");
    parentLocation = await _findLocationById(req.body.parentLocation);
    if (!parentLocation)
      return res.status(400).send("No such parent Location found.");
    if (parentLocation.name === req.body.name)
      return res.status(400).send("Child can not have same name as parent");

    //validate no same categories in certain branch of categories tree
    if (parentLocation.hasChild) {
      siblingsList = await childsOf(req.body.parentLocation);
      let matchedLocation = siblingsList.find(c => c.name === req.body.name);
      if (matchedLocation)
        return res.status(400).send("Location already found.");
    }
  } else {
    let location = await Location.findOne({
      parentLocation: null,
      name: req.body.name,
      companyId: req.body.companyId
    });
    if (location) return res.status(400).send("Location Already Exists");
  }
  //find childs of parentLocation

  let location = new Location(req.body);

  try {
    await location.save();
    res.send(location);
    //update has child of parent of new category
    if (parentLocation && !parentLocation.hasChild) {
      const updatedparentLocation = await toggleHasChild(parentLocation._id);
      console.log("Updated Parent Location", updatedparentLocation);
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

async function isUnique(name, parentLocation) {
  let siblingsList = null;

  //validate no same categories in certain branch of categories tree
  if (parentLocation.hasChild) {
    siblingsList = await childsOf(parentLocation._id);
    if (siblingsList.find(c => c.name === name)) return false;
  }
  return true;
}

router.post("/bulk", async (req, res) => {
  console.log(req.body.locations);

  let locations = req.body.locations;
  if (locations.length < 0)
    return res.status(400).send("No Locations in the body");
  let ids = [];
  let docs = [];
  let index = locations.findIndex(c => c.name === "General");
  if (index >= 0) locations.splice(index, 1);
  //if there is no category in DB
  let locationsInDb = await Location.find({ companyId: req.body.companyId });
  let generaIndex = locationsInDb.findIndex(
    c => c.name === "General" && !c.parentLocation
  );

  if (generaIndex < 0) {
    locations.push({
      id: locations.length + 1,
      name: "General",
      hasChild: false,
      companyId: req.body.companyId
    });
  }
  // List<Category> documents= new ArrayList();
  locations.forEach(location => {
    let oldId = location._id;
    delete location._id;
    if (location.parentLocation) {
      let newparentLocation = ids.find(
        obj => obj.oldId == location.parentLocation
      ).newId;
      location.parentLocation = newparentLocation;
    }
    if (!location.companyId) location.companyId = req.body.companyId;
    let persistentLocation = new Location(location);
    ids.push({ oldId: oldId, newId: persistentLocation._id });
    docs.push(persistentLocation);
  });
  console.log(ids);
  console.log(docs);
  Location.collection.insertMany(docs, (err, result) => {
    if (err) res.status(400).send(err);
    else {
      console.log(result);
      res.status(200).send("Successful");
    }
  });
});

router.put("/updatebulk", authUser, async (req, res) => {
  let errors = [];
  if (!req.body.locations) return res.status(400).send("No Location provided");
  let { locations } = req.body;
  console.log(locations);
  locations.forEach(async locations => {
    if (!locations.companyId) locations.companyId = req.user.companyId;

    let id = locations._id;
    delete locations._id;
    try {
      await Location.findByIdAndUpdate({ _id: id }, locations);
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

router.put("/:id", authUser, async (req, res) => {
  if (!req.body.companyId) req.body.companyId = req.user.companyId;
  console.log(req.body, "Before");
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  //find category
  let location = await Location.findOne({ _id: req.params.id });
  if (!location)
    return res.status(404).send("No Location with given Id found.");
  let rootLocation = await Location.findOne({ name: "root", companyId: null });
  let parentLocation = null;
  if (req.body.parentLocation && req.body.parentLocation == rootLocation._id) {
    console.log("Ids equal");
    req.body.parentLocation = null;
    parentLocation = null;
  } else parentLocation = await _findLocationById(req.body.parentLocation);

  //check if the name is different then confirm its not already present
  if (location.name !== req.body.name) {
    let isUniqueName = await isUnique(parentLocation, req.body.name);
    if (!isUniqueName) {
      return res.status(400).send("Location with given name is already exists");
    }
  }
  //check if parent is being changed
  if (
    location.parentLocation &&
    location.parentLocation != req.body.parentLocation
  ) {
    //check old parent has more than 2 childs
    let childs = await childsOf(location.parentLocation);
    if (childs.length <= 2) {
      let oldParent = await toggleHasChild(location.parentLocation);
      console.log("Old parent", oldParent);
    }
  }
  //check for valid parent category
  if (req.body.parentLocation && req.body.parentLocation === req.params.id) {
    return res.status(400).send("Location cannot be its own Parent.");
  }
  console.log(req.body);
  //then update it
  try {
    location = await Location.findByIdAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        new: true
      }
    );
    let updatedparentLocation = parentLocation;
    if (parentLocation && !parentLocation.hasChild) {
      updatedparentLocation = await toggleHasChild(parentLocation._id);
      console.log("Updated Parent Location", updatedparentLocation);
    }
    res.send({ location: location, parent: updatedparentLocation });
  } catch (error) {
    console.log("Error while updating", error);
  }
});

// // for sentiment analysis
// router.post("/sentiment/selection", authUser, async (req, res) => {
//   console.log(req.body);
//   const cat = categorySelection(req.body.details);
//   const category = await Category.findOne({
//     name: cat,
//     companyId: req.user.companyId
//   });

//   if (!category) {
//     return res.status(404).send("No Category found");
//   }
//   res.send(category);
// });

router.delete("/:id", async (req, res) => {
  const location = await Location.findById(req.params.id);
  console.log(location);
  if (!location) return res.status(400).send("Location Not found");
  if (!location.hasChild) {
    //make has child false of the parent of deleting catg if no child left
    if (location.parentLocation) {
      let childs = await childsOf(location.parentLocation);
      if (childs.length === 1) {
        await toggleHasChild(location.parentLocation);
      }
    }
    try {
      await Location.findOneAndRemove({ _id: req.params.id });
      return res.send(location);
    } catch (error) {
      return res.send(error);
    }
  }
  return res.status(400).send("You cannot delete this Location");
});

router.delete("/childsOf/:id", async (req, res) => {
  try {
    let childs = await childsOf(req.params.id);
    console.log(childs);
    if (childs.length > 0) {
      for (let index = 0; index < childs.length; index++) {
        await Location.findByIdAndRemove(childs[index]._id);
      }
      await toggleHasChild(req.params.id);
    }
    return res.status(200).send("Successfully deleted");
  } catch (error) {
    return res.status(400).send("Some error occured");
  }
});

module.exports = router;
