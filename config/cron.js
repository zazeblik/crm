module.exports.cron = {
    Job: {
      schedule: '0 0 0 * * *',
      onTick: function () {
        sails.log("Create trains");
        var date = new Date();
        var day = (date).getDay();
        if (!day) day == 7;
        day = day.toString();
        Groups.find({schedule: {contains: day}}, function(err, groups){
            
            if (groups.length){
                for (var i=0; i < groups.length; i++){
                    var train = {
                        group: groups[i].id,
                        description: "Создано автоматически"
                    };
                    if (groups[i].hall) train.hall = groups[i].hall;
                    if (groups[i].trener) train.trener = groups[i].trener;
                    if (groups[i].time && groups[i].duration) {
                        var hours = ((groups[i].time).split(":"))[0]
                        var minutes = ((groups[i].time).split(":"))[1];
                        var start_date = new Date(date.getFullYear(),date.getMonth(),date.getDate(),Number(hours),Number(minutes))
                        train.datetime = start_date.getTime();
                        start_date.setMinutes(start_date.getMinutes()+groups[i].duration);
                        train.datetime_end =  start_date.getTime();
                    }
                    Trains.create(train, function(err,data){})
                }
            }
        })
      }
    }
  };