module.exports = {
  attributes: {
    createdAt: false,
    name: {
      type: 'string',
      required: true
    },
    login: {
      type: 'string',
      unique: true,
      required: true
    },
    password: {
      type: 'string',
      required: true
    },
    role: {
      type: 'string',
      isIn: ['администратор','тренер'],
      defaultsTo: 'тренер'
    },
    toView: {
      type: "string",
      allowNull: true
    },
    updater: {
      model: "Users"
    }
  },
  beforeCreate: function (values, next) {
    if (values.password) values.password = Buffer.from(values.password).toString('base64');
    values.toView = values.name;
    next();
  },
  beforeUpdate: function (values, next) {
    if (values.password) values.password = Buffer.from(values.password).toString('base64');
    if (values.name) values.toView = values.name;
    next();
  },
};

