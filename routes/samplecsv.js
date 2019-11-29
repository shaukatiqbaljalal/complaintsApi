const fs = require("fs");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const path = require("path");

router.get("/:name", async (req, res) => {
  try {
    console.log(req.params.name, "Name of file");
    const filePath = path.join(process.cwd(), req.params.name);
    console.log(filePath);
    var file = fs.createReadStream(filePath);

    var stat = fs.statSync(filePath);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "application/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${req.params.name}.csv`
    );
    file.pipe(res);
  } catch (error) {
    return res.status(400).send(error);
  }
});
module.exports = router;
