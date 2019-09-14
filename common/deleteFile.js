const fs = require("fs");
module.exports = function deleteFile(filePath) {
  fs.unlink(filePath, error => {
    !error ? console.log("Successfully deleted the file") : console.log(error);
  });
};
