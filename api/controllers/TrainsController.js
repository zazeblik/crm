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
    }
};

