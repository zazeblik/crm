module.exports = {
  fn: async function() {
    let date = new Date();
    let groups = await Groups.find({ schedule: { "!=": "" } });
    let current_date = date.getDate();
    let months_days = daysInMonth(date.getMonth(), date.getFullYear());
    for (let j = current_date; j <= months_days; j++) {
      let current_month_date = new Date(date.getFullYear(), date.getMonth(), j);
      let day = getDay(current_month_date);
      for (var i = 0; i < groups.length; i++) {
        let group = groups[i];
        let week_day_times = group.schedule.split(",");
        let schedule = {};
        week_day_times.forEach(week_day_time => {
          let week_day = week_day_time.split(" ")[0];
          let day_time = week_day_time.split(" ")[1];
          schedule[week_day] = day_time;
        });
        if (schedule[day] && groups[i].duration) {
          let train = {
            group: groups[i].id,
            description: "Создано автоматически"
          };
          if (groups[i].hall) train.hall = groups[i].hall;
          if (groups[i].trener) train.trener = groups[i].trener;
          let hours = schedule[day].split(":")[0];
          let minutes = schedule[day].split(":")[1];
          let start_date = new Date(
            current_month_date.getFullYear(),
            current_month_date.getMonth(),
            current_month_date.getDate(),
            Number(hours),
            Number(minutes)
          );
          train.datetime = start_date.getTime();
          start_date.setMinutes(start_date.getMinutes() + groups[i].duration);
          train.datetime_end = start_date.getTime();
          try {
            console.log(train);
            await Trains.create(train);
          } catch (error) {}
        }
      }
    }
  }
};

function getDay(date){
  var day = (date).getDay();
  if (!day) day = 7;
  day = day.toString();
  return day   
}

function daysInMonth(month,year) {
  return 32 - new Date(year, month, 32).getDate();
}