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

function getMonthwiseStages(params) {
  return [
    {
      $project: {
        status: 1,
        submittedOn: {
          $dateToParts: {
            date: "$timeStamp"
          }
        }
      }
    },

    {
      $match: {
        "submittedOn.year": { $eq: new Date().getFullYear() }
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
module.exports = {
  getSummaryStages,
  getMonthwiseStages
};
