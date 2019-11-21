module.exports = {
    get_total: async function(req, res){
        if (!req.param("group_id"))
            return res.status(400).send("group_id required");
        
        let group_id = req.param("group_id")
        try {
            let group = await Groups.findOne(group_id).populate("members")
            let group_members_ids = _.pluck(group.members, "id")
            let trains = await Trains.find({group: group_id}).populate("members")
            let result = {};
            trains.forEach(train => {
                let train_members_ids = _.pluck(train.members, "id")
                let intersect = train_members_ids.filter(train_member_id => group_members_ids.includes(train_member_id));    
                result[train.id] = intersect.length
            });
            
            return res.send(result);
        } catch (error) {
            return res.status(400).send(error);
        }
    },
    generate_trains: async function(req, res){
        await sails.helpers.trainsGenerate(Date.now());
        return res.ok();        
    },
    generate_next_month_trains: async function(req, res){
        var d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        d.setHours(0, 0, 0);
        d.setMilliseconds(0);
        await sails.helpers.trainsGenerate(d.getTime());
        return res.ok();        
    }
};