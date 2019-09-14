const { Category } = require("../models/category");

module.exports = async function(categoryByname) {
  const category = await Category.findOne({ name: categoryByname });
  console.log("category", category);
  return category ? category : null;
};
