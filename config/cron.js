module.exports.cron = {
    Job: {
      schedule: '0 0 0 * * *',
      onTick: function () {
        sails.log("Create trains");
        var date = new Date();
        var day = (date).getDay();
        if (!day) day = 7;
        day = day.toString();
        Groups.find({schedule: {"!=": ""}}, function(err, groups){
            for (var i=0; i < groups.length; i++){
                let group = groups[i];
                let week_day_times = group.schedule.split(",");
                let schedule = {};
                week_day_times.forEach(week_day_time => {
                    let week_day = week_day_time.split(" ")[0];
                    let day_time = week_day_time.split(" ")[1];
                    schedule[week_day] = day_time;
                });
                if (schedule[day]){
                    var train = {
                        group: groups[i].id,
                        description: "Создано автоматически"
                    };
                    if (groups[i].hall) train.hall = groups[i].hall;
                    if (groups[i].trener) train.trener = groups[i].trener;
                    var hours = (schedule[day].split(":"))[0]
                    var minutes = (schedule[day].split(":"))[1];
                    var start_date = new Date(date.getFullYear(),date.getMonth(),date.getDate(),Number(hours),Number(minutes))
                    train.datetime = start_date.getTime();
                    start_date.setMinutes(start_date.getMinutes()+groups[i].duration);
                    train.datetime_end =  start_date.getTime();
                    Trains.create(train, function(){})
                }                
            }
        })
      }
    }
  };