module.exports.bootstrap = async function(done) {
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
