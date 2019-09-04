
module.exports = {
  attributes: {
    createdAt: false,
    group: {
      model: "Groups",
      required: true
    },
    trener: {
      model: "Persons"
    },
    datetime: {
      type: "number",
      required: true
    },
    datetime_end: {
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
      ],
      required: true
    },
    description: {
      type: "string",
      allowNull: true
    },
    toView: {
      type: "string",
      unique: true,
      allowNull: true
    },
    members: {
      collection: "Persons",
      via: "trains"
    },
    updater: {
      model: "Users"
    }
  },
  beforeCreate: function (value, callback) {
    if (value.group && value.datetime){
      Groups.findOne(value.group, function(err,data){
        if (err) {
          callback()
        } else {
          var date = new Date(value.datetime);
          value.toView = data.label+" ("+date.getDate()+"."+addZeros((date.getMonth()+1))+"."+date.getFullYear()+" "+addZeros(date.getHours())+":"+addZeros(date.getMinutes())+")"
          callback()
        }
      })
    } else {
      callback();
    }
  },
  beforeUpdate: function (value, callback) {
    if (value.group && value.datetime){
      Groups.findOne(value.group, function(err,data){
        if (err) {
          callback()
        } else {
          var date = new Date(value.datetime);
          value.toView = data.label+" ("+date.getDate()+"."+addZeros((date.getMonth()+1))+"."+date.getFullYear()+" "+addZeros(date.getHours())+":"+addZeros(date.getMinutes())+")"
          callback()
        }
      })
    } else {
      callback();
    }
  }
};

function addZeros(n, needLength) {
  needLength = needLength || 2;
  n = String(n);
  while (n.length < needLength) {
      n = "0" + n;
  }
  return n
}