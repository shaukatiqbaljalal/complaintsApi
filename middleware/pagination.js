const paginate = require("../common/paginate");
const ObjectId = require("mongodb").ObjectID;
const escapeRegex = require("./../common/regex-excape");

function executePagination(Modal) {
  return async (req, res, next) => {
    let pageNum = +req.params.pageNo || 1;
    let pageSize = +req.params.pageSize || 10;
    try {
      let { itemsCount, items } = await paginate(
        pageSize,
        pageNum,
        Modal,
        req.body.filter
      );

      res.header("itemsCount", itemsCount);
      res.header("access-control-expose-headers", "itemsCount");
      res.send(items);
    } catch (error) {
      return res.status(500).send(error);
    }
  };
}
function prepareFilter(req, res, next) {
  let { searchBy, searchKeyword, keywordType } = req.query;
  let filter = { companyId: ObjectId(req.user.companyId) };
  if (searchBy && searchKeyword) {
    if (keywordType !== "ObjectId") {
      searchKeyword = new RegExp(escapeRegex(searchKeyword), "gi");
    }
    filter[searchBy] = searchKeyword;
    // filter.category = "5df24391218a6435a4c1b667";
  }

  req.body.filter = filter;
  next();
}

module.exports = { executePagination, prepareFilter };
