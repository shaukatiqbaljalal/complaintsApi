const { config, uploader } = require("cloudinary").v2;
const envVars = require("config");

const cloudinaryConfig = (req, res, next) => {
  config({
    cloud_name: envVars.get("CLOUDINARY_CLOUD_NAME"),
    api_key: envVars.get("CLOUDINARY_API_KEY"),
    api_secret: envVars.get("CLOUDINARY_API_SECRET")
  });
  next();
};
module.exports = { cloudinaryConfig, uploader };
