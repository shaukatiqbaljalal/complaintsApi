const { Configuration, validate } = require("../models/configuration");
const express = require("express");
const router = express.Router();
const _ = require("lodash");

router.get("/", async (req, res) => {
  let configuration = await Configuration.findOne();
  if (!configuration) return res.status(404).send("No configuration object");
  res.send(configuration);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let configuration = await Configuration.find();
  if (configuration.length > 0)
    return res.status(400).send("Configuration object already exists.");

  configuration = new Configuration(req.body);
  try {
    await configuration.save();
    res.send(configuration);
  } catch (error) {
    res.send(error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    let configuration = await Configuration.findById(req.params.id);
    if (!configuration)
      return res
        .status(404)
        .send("The configuration object with the given ID was not found.");

    configuration = await Configuration.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true
      }
    );
    console.log(configuration);
    res.send(configuration);
  } catch (error) {
    console.log(error);
  }
});
router.delete("/:id", async (req, res) => {
  let configuration = await Configuration.findByIdAndRemove(req.params.id);
  if (!configuration)
    return res
      .status(404)
      .send("Configuration object with given ID Not Found.");

  res.status(200).send(configuration);
});

module.exports = router;
