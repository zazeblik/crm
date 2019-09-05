module.exports = {
    for_report: async function(req, res){
        if (req.param("group") && req.param("start") && req.param("end")) {
            var group = req.param("group")
            var start = req.param("start")
            var end = req.param("end")
            try {
                var pays_data = await Payments.find({
                    where: {
                        or: [{ starts: { "<": end } }, { ends: { ">=": start } }]
                    }
                }).sort("starts ASC")
                var pays = []
                for (var i=0; i < pays_data.length; i++){
                    if (pays_data[i].group == group) {
                        pays.push(pays_data[i])
                    }
                }
                return res.send(pays)
            } catch(err){
                return res.status(400).send(err)
            }
        } else {
            return res.status(400).send("Parameter group, start and end is required");
        }
    }

};

