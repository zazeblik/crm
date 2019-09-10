var XLSX = require('xlsx');
var fs = require("fs");
var moment = require('moment')
module.exports = {
    import: function (req, res) {
        if (req.method == "POST" && req.file('file0')) {
            req.file('file0').upload({
                saveAs: req.session.User.id + ".json",
                dirname: require('path').resolve(sails.config.appPath, 'assets/uploads')
            }, function whenDone(err, uploadedFiles) {
                if (err) {
                    return res.negotiate(err);
                }
                if (uploadedFiles.length === 0) {
                    return res.badRequest('No file was uploaded');
                }
                fs.readFile(uploadedFiles[0].fd, function (err, file) {
                    if (err) {
                        return res.send(400, err);
                    } else {
                        try {
                            var workbook = XLSX.read(file, { type: 'buffer' });
                            var sheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];
                            var json = XLSX.utils.sheet_to_json(sheet);
                            fs.readFile(sails.config.appPath+'/assets/js/language.js', {encoding:'utf8'},function(err, str_data){
                                var start = str_data.indexOf("{")
                                var end = str_data.indexOf("}")
                                var object_str = str_data.substr(start, end-start+1);
                                var words = JSON.parse(object_str)
                                var transform = {}
                                for (var prop in words){
                                    transform[words[prop]] = prop
                                }
                                var result = [];
                                for (var i = 0; i < json.length; i++){
                                    var tmp = {updater: req.session.User.id};
                                    for (var prop in json[i]){
                                        if(transform[prop] == 'birthday') {
                                            if (json[i][prop] == '') {
                                                tmp[transform[prop]] = null;
                                            } else {
                                                tmp[transform[prop]] = moment(json[i][prop], 'DD.MM.YYYY').valueOf();
                                            }
                                        } else {
                                            if(json[i][prop]) tmp[transform[prop]] = json[i][prop];
                                        }
                                        
                                    }
                                    if (tmp.name) result.push(tmp);
                                }
                                Persons.createEach(result).exec(function(err){
                                    if (err) {
                                        return res.status(400).send(err);
                                    } else {
                                        return res.ok()
                                    }                                
                                })     
                            })                       
                        } catch (error) {
                            return res.status(400).send(error);
                        }
                    }
                })
            });
        } else {
            return res.send(400, {
                success: false,
                error: "POST file0 is required"
            });
        }
    }
};

