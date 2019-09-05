module.exports = {
  attributes: {
    createdAt: false,
    payer: {
      model: "Persons"
    },
    group: {
      model: "Groups"
    },
    sum: {
      type: "number",
      required: true
    },
    type: {
      type: "string",
      isIn: ["обычный", "разовый", "абонемент"]
    },
    count: {
      type: "number",
      allowNull: true
    },
    starts: {
      type: "number",
      required: true
    },
    ends: {
      type: "number",
      required: true
    },
    description: {
      type: "string",
      allowNull: true
    },
    toView: {
      type: "string",
      allowNull: true
    },
    updater: {
      model: "Users"
    }
  },
  afterCreate: function (value, callback) {
    Payments.find({id: value.id}).populate("payer").exec(function(err,data){
      if (err) {
        callback();
      } else {
        data = data[0];
        var payer = data.payer;
        var sum = data.sum;
        var starts = new Date(data.starts);
        var ends = new Date(data.ends);
        var toView = "";
        if (payer) toView += payer.name+"-";
        if (sum) toView += sum;
        if (starts && ends) {
          toView += "["+addZeros(starts.getDate())+"."+addZeros((starts.getMonth()+1))+"("+addZeros(starts.getHours())+":"+addZeros(starts.getMinutes())+")-"+
          addZeros(ends.getDate())+"."+addZeros((ends.getMonth()+1))+"("+addZeros(ends.getHours())+":"+addZeros(ends.getMinutes())+")]"
        }
        Payments.update(value.id, {toView: toView}, function(){
          callback();
        })
      }
    })
  },
  afterUpdate: function (value, callback) {
    Payments.find({id: value.id}).populate("payer").exec(function(err,data){
      if (err) {
        callback();
      } else {
        data = data[0];
        var payer = data.payer;
        var sum = data.sum;
        var starts = new Date(data.starts);
        var ends = new Date(data.ends);
        var toView = "";
        if (payer) toView += payer.name+"-";
        if (sum) toView += sum;
        if (starts && ends) {
          toView += "["+addZeros(starts.getDate())+"."+addZeros((starts.getMonth()+1))+"("+addZeros(starts.getHours())+":"+addZeros(starts.getMinutes())+")-"+
          addZeros(ends.getDate())+"."+addZeros((ends.getMonth()+1))+"("+addZeros(ends.getHours())+":"+addZeros(ends.getMinutes())+")]"
        }
        Payments.update(value.id, {toView: toView}, function(){
          callback();
        })
      }
    })
  },
};

function addZeros(n, needLength) {
  needLength = needLength || 2;
  n = String(n);
  while (n.length < needLength) {
      n = "0" + n;
  }
  return n
}