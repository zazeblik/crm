module.exports = {
  attributes: {
    createdAt: false,
    label: {
      type: "string",
      required: true
    },
    trener: {
      model: "Persons"
    },
    sum: {
      type: "number",
      required: true
    },
    hall: { 
      type: 'string',
      isIn: [
        'фиолетовый',
        'серый',
        'тренажерный',
        'малый',
        'другой'
      ]
    },
    duration: {
      type: "number",
      defaultsTo: 90
    },
    type: {
      type: "string",
      isIn: ["групповая", "индивидуальная","сборы","сбор денег"],
      defaultsTo: "групповая"
    },
    once_sum: {
      type: "number"
    },
    schedule: {
      type: "string",
      allowNull: true
    },
    members: {
      collection: "Persons",
      via: "groups"
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
    values.toView = values.label;
    next();
  },
  afterCreate: function (values, next) {
    Sumchanges.create({
      group: values.id,
      sum: values.sum,
      once_sum: values.once_sum
    }, function(){
      next();
    })
  },

  beforeUpdate: function (values, next) {
    Sumchanges.create({
      group: values.id,
      sum: values.sum,
      once_sum: values.once_sum
    }, function(){
      if (values.label) values.toView = values.label;
      next();
    })    
  },
  afterUpdate: function (values, next) {
    if (values.label) values.toView = values.label;
    next();
  },
  beforeDestroy: function (values, next) {
    if (values.id || values.where.id) {
      var id = values.id || values.where.id;
      Trains.destroy({group: id}, function(){
        Sumchanges.destroy({group: id}, function(){
          next();
        })        
      })  
    } else {
      next();
    }
  },
};

