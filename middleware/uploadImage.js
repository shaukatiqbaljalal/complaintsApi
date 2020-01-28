const { uploader } = require("../config/cloudinaryConfig");
const Datauri = require("datauri");
const dUri = new Datauri();
const path = require("path");

const dataUri = req =>
  dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer);

module.exports = async function(req, res, next) {
  if (req.file) {
    const file = dataUri(req).content;

    try {
      let { url } = await uploader.upload(file);
      req.body.profilePath = url;
    } catch (err) {}
  }
  next();
};
