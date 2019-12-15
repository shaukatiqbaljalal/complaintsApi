async function paginate(pageSize, pageNum, Modal, filter) {
  let result = {
    items: [],
    itemsCount: 0
  };
  try {
    console.log(filter);
    const itemsCount = await Modal.find(filter).count();
    if (!itemsCount) return result;

    const items = await Modal.find(filter)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .populate("assignedTo", "name _id")
      .populate("complainer", "name _id")
      .populate("category", "name _id");

    return {
      items,
      itemsCount
    };
  } catch (error) {
    return error;
  }
}

module.exports = paginate;
