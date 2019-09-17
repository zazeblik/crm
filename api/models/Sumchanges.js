module.exports = {

  attributes: {
    createdAt: false,
    group: {
      model: "Groups",
      required: true
    },
    sum: {
      type: "number",
      allowNull: true
    },
    once_sum: {
      type: "number",
      allowNull: true      
    }
  },

};

