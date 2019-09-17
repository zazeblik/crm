module.exports.bootstrap = async function(done) {
  let groups = await Groups.find({});
  let sumchanges = await Sumchanges.find({});
  
  let unique_changes_group_ids = new Set();
  for (let i = 0; i < sumchanges.length; i++){
    unique_changes_group_ids.add(sumchanges[i].group);
  }
  for (let i = 0; i < groups.length; i++){
    let group_id = groups[i].id;
    if (!unique_changes_group_ids.has(group_id)) {
      await Sumchanges.create({
        group: group_id,
        sum: groups[i].sum,
        once_sum: groups[i].once_sum
      })
    }
  }
  if (await Users.count() > 0) {
    return done();
  } else {
    await Users.create({
      name: "Администратор",
      login: "admin",
      password: "admin",
      role: "администратор"
    })
    return done();
  }
};
