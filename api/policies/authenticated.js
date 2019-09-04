module.exports = function(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    if (req.session.authenticated && req.session.User) {
        return next();
    } else {
        return res.forbidden();
    }
};
