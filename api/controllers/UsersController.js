/**
 * UsersController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
    get_profile: function(req, res) {
        return res.status(200).send(req.session.User);
    }
};

