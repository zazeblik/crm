module.exports = {
  login: function(req, res) {
    if (req.param("login") && req.param("password")) {
      var login = req.param("login");
      var password = Buffer.from(req.param("password")).toString("base64");
      Users.findOne({ login: login, password: password }, function(
        err,
        profile
      ) {
        if (err) {
          return res.status(400).send(err);
        } else {
          if (!profile) {
            return res
              .status(400)
              .send("Пользователь с такими логином и паролем не найден");
          } else {
            req.session.authenticated = true;
            req.session.User = profile;
            return res.status(200).send(profile);
          }
        }
      });
    } else {
      return res.status(400).send("Необходимо указать логин и пароль!");
    }
  },
  logout: function(req, res) {
    delete req.session.User;
    req.session.authenticated = false;
    return res.ok();
  }
};
