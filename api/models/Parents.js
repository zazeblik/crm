module.exports = {
  attributes: {
    createdAt: false,
    name: {
      type: "string",
      required: true
    },
    birthday: {
      type: 'string',
      allowNull: true
    },
    job: {
      type: 'string',
      allowNull: true
    },
    personality: {
      type: 'string',
      allowNull: true
    },
    child: {
      collection: "Persons",
      via: "parents"
    },
    toView: {
      type: "string",
      unique: true,
      allowNull: true
    },
    updater: {
      model: "Users"
    }
  },
  beforeCreate: function (values, next) {
    values.toView = values.name;
    next();
  },
  beforeUpdate: function (values, next) {
    if (values.name) values.toView = values.name;
    next();
  },
};

