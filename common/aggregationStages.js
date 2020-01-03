function getSummaryStages() {
  return [
    { $match: { spam: false } },
    {
      $project: {
        status: 1
      }
    },
    {
      $group: {
        _id: {
          status: "$status"
        },
        totalComplaints: { $sum: 1 }
      }
    }
  ];
}

function getMonthwiseStages(aggregateType = "monthwise") {
  let dateName = aggregateType === "monthwiseUsers" ? "createdAt" : "timeStamp";
  return [
    {
      $project: {
        status: 1,
        submittedOn: {
          $dateToParts: {
            date: `$${dateName}`
          }
        }
      }
    },

    {
      $match: {
        "submittedOn.year": { $eq: 2019 }
        // "submittedOn.year": { $eq: new Date().getFullYear() }
      }
    },
    {
      $group: {
        _id: {
          month: "$submittedOn.month"
          // status: "$status"
        },
        // date: { $first: "$submittedOn.month" },
        year: { $first: "$submittedOn.year" },
        totalComplaints: { $sum: 1 }
      }
    },
    { $sort: { month: 1 } }
  ];
}

function getUniqueCategoriesStages(aggregateType = "monthwise") {
  return [
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryObj"
      }
    },
    {
      $group: {
        _id: {
          categoryName: "$categoryObj.name"
          // status: "$status"
        },
        categoryId: { $first: "$category" },
        totalComplaints: { $sum: 1 }
      }
    }
  ];
}
module.exports = {
  getSummaryStages,
  getMonthwiseStages,
  getUniqueCategoriesStages
};
