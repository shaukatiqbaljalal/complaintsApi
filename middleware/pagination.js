const paginate = require("../common/paginate");
const ObjectId = require("mongodb").ObjectID;

function executePagination(Modal) {
  return async (req, res, next) => {
    let pageNum = +req.params.currentPage || 1;
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
  let { searchBy, searchKeyword } = req.query;
  let filter = { companyId: ObjectId(req.user.companyId) };
  if (searchBy && searchKeyword) {
    regex = new RegExp(escapeRegex(searchBy), "gi");
    filter[searchBy] = regex;
  }

  req.body.filter = filter;
  next();
}

module.exports = { executePagination, prepareFilter };
