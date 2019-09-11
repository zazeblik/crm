module.exports = {
  attributes: {
    createdAt: false,
    name: {
      type: "string",
      required: true
    },
    birthday: {
      type: 'number',
      allowNull: true
    },
    book_number: {
      type: 'string',
      allowNull: true
    },
    dance_class: {
      type: 'string',
      allowNull: true
    },
    dance_class_approve_date: {
      type: 'string',
      allowNull: true
    },
    rank: {
      type: 'string',
      allowNull: true
    },
    rank_minsport: {
      type: 'string',
      allowNull: true
    },
    rank_ends: {
      type: 'string',
      allowNull: true
    },
    rank_book_exists: {
      type: 'boolean',
      defaultsTo: false
    },
    personality: {
      type: 'string',
      allowNull: true
    },
    phone: {
      type: 'string',
      allowNull: true
    },
    address: {
      type: 'string',
      allowNull: true
    },
    debt: {
      type: 'number',
      allowNull: true
    },
    parents: {
      collection: "Parents",
      via: "child"
    },
    groups: {
      collection: "Groups",
      via: "members"
    },
    trains: {
      collection: "Trains",
      via: "members"
    },
    payments: {
      collection: "Payments",
      via: "payer"
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
  afterUpdate: function (values, next) {
    if (values.name) values.toView = values.name;
    next();
  }
};

