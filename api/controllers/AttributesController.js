var moment = require("moment");
const datetimes = ["datetime","datetime_end","starts","ends","updatedAt","createdAt"]
const dates = ["birthday"]
const months_names = [ "Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь" ]
const words_path = sails.config.appPath+'/config/locales/ru.json'
const transform = {
    "train": {
        "тренировка": {
            "trains": "Тренировки",
            "train": "Тренировка",
            "for_train": "тренировку"
        },
        "заниятие": {
            "trains": "Занятия",
            "train": "Занятие",
            "for_train": "занятие"
        },
        "урок": {
            "trains": "Уроки",
            "train": "Урок",
            "for_train": "урок"
        },
        "репитиция": {
            "trains": "Репитиции",
            "train": "Репитиция",
            "for_train": "репитицию"
        }
    }, 
    "trener": {
        "тренер": {
            "trener": "Тренер",
            "for_treners": "тренерам"
        },
        "преподаватель": {
            "trener": "Преподаватель",
            "for_treners": "преподавателям"
        },
        "учитель": {
            "trener": "Учитель",
            "for_treners": "учителям"
        }
    },
    "course": {
        "сборы": {
            "course": "сборы"
        },
        "курс": {
            "course": "курс"
        }
    }
}
var fs = require("fs")
function ucFirst(str) {
    if (!str) return str; 
    return str[0].toUpperCase() + str.slice(1);
}

function compareByNames( a, b ) {
    if ( a.name < b.name ){
      return -1;
    }
    if ( a.name > b.name ){
      return 1;
    }
    return 0;
}

function compareByGroupIds( a, b ) {
    if ( a.group_ids > b.group_ids ){
      return -1;
    }
    if ( a.group_ids < b.group_ids ){
      return 1;
    }
    return 0;
}
module.exports = {
    models: function(req, res){
        var data = [];
        for (var prop in sails.models){
            if (prop != "archive") data.push(prop);
        }
        return res.status(200).send(data);
    },
	get: function (req, res){
        if (req.param('model')){
            if (sails.models[(req.param('model')).toLowerCase()]) {
                return res.send(sails.models[(req.param('model')).toLowerCase()].attributes)
            } else {
                return res.status(404).send("Model not found")
            }
        } else {
            return res.status(400).send('Attribute model is required!');
        }
    },
    names: function (req, res){
        if (req.param('model')){
            var model = eval(ucFirst(req.param('model')))
            model.find({},function(err,data){
                if (err) return res.status(400).send(err);
                else {
                    return res.send(data);
                }
            })
        } else {
            return res.status(400).send('Attribute model is required!');
        }
    },
    count: function(req, res){
        if (req.param('model')){
            var model = eval(ucFirst(req.param('model')));
            var where = {};
            if (req.param('where')){
                where = JSON.parse(req.param('where'));
            }
            model.count(where, function(err, count){
                if (err) return res.status(400).send(err);
                else {
                    return res.send(count.toString());
                }
            })
        } else {
            return res.status(400).send('Attribute model is required!');
        }
    },
    list: async function (req, res) {
        if (!req.query.rows) return res.status(400).send("rows is required!");
        if (!req.query.page) return res.status(400).send("page is required!");
        if (!req.query.model) return res.status(400).send("model is required!");
        var model = eval(ucFirst(req.param('model')));
        var attributes = sails.models[(req.param('model')).toLowerCase()].attributes;
        var perPage = req.query.rows;
        var currentPage = req.query.page;
        var sort = "updatedAt DESC";
        var conditions = {};
        if (req.query.sort)  {
            sort = req.query.sort 
        }
        if (req.query.conditions) {
            try{
                var conditions = JSON.parse(req.query.conditions);
                for (var prop in conditions) {
                    if (attributes[prop].type){
                        if (attributes[prop].type == "string") {
                            conditions[prop] = {"contains": conditions[prop]}
                        } else if (attributes[prop].type == "number"){
                            if (datetimes.includes(prop)){
                                conditions[prop] = {">=": moment(conditions[prop], "DD.MM.YYYY HH:mm").valueOf()}
                            } else if (dates.includes(prop)){
                                conditions[prop] = {">=": moment(conditions[prop], "DD.MM.YYYY").valueOf()}
                            } else {
                                conditions[prop] = Number(conditions[prop]);
                            }
                        } else if (attributes[prop].type == "boolean"){
                            if (conditions[prop] == "false") {
                                conditions[prop] = false
                            } else {
                                conditions[prop] = true
                            }
                        }
                    } else {
                        if (attributes[prop].model){
                            conditions[prop] = await (eval(ucFirst(attributes[prop].model))).find({toView: {"contains": conditions[prop]}});
                            var ids = [];
                            for (var i = 0; i < conditions[prop].length; i++){
                                ids.push(conditions[prop][i].id)
                            }
                            conditions[prop] = {in: ids};
                        } else {
                            conditions[prop] = {"contains": conditions[prop]}
                        }
                    }
                }
            }catch(err){
                console.log(err);
            }            
        }
        
        var assocs = [];
        for (prop in attributes){
            if (attributes[prop].model || attributes[prop].collection){
                assocs.push({name: prop});
            }
        }
        var query = {where: conditions};
        model.count(query, function(err, total){
            if (err) {
                console.log("count error");
                return res.status(400).send(err);
            } else {
                var total_pages = Math.ceil(total/perPage)
                
                query.limit = perPage;
                query.sort = sort;
                query.skip = (currentPage - 1)*perPage;
                if (req.query.populate) {
                    var populates = req.query.populate.split(",");
                    
                    var find_str = 'model.find(query)';
                    for (var i = 0; i < populates.length; i++){
                        find_str += '.populate("'+populates[i]+'")'
                    }
                    if (req.param('model') == "persons" && sort == "updatedAt DESC"){
                        find_str += '.populate("groups")'
                    }
                    (eval(find_str)).exec(function(err, data){
                        if (err) {
                            console.log("find error");
                            return res.status(400).send(err);
                        } else {
                            // if (req.param('model') == "persons" && sort == "updatedAt DESC"){
                            //     for(let i = 0; i < data.length; i++){
                            //         data[i].group_ids = (_.pluck(data[i].groups,"toView")).toString();
                            //         delete data[i].groups;
                            //     }
                                
                            //     data = data.sort(compareByNames)
                            //     data = data.sort(compareByGroupIds)
                            // }
                            
                            return res.send({total: total, total_pages: total_pages, data: data, perPage: perPage, page: currentPage});
                        }
                    })
                } else {
                    model.find(query).populateAll().exec(function(err, data){
                        if (err) {
                            console.log("find error");
                            return res.status(400).send(err);
                        } else {
                            return res.send({total: total, total_pages: total_pages, data: data, perPage: perPage, page: currentPage});
                        }
                    })
                }                
            }            
        })
    },
    presonal_report: async function(req, res){
        let start = req.param("start")
        let end = req.param("end")
        let trener = req.param("trener")
        if (!start) return res.serverError("start is required")
        if (!end) return res.serverError("end is required")
        if (!trener) return res.serverError("trener is required")
        var trains_where = {
            datetime: {
                ">=": start
            },
            datetime_end: {
                "<=": end
            }
        };
        trains_where.trener = trener
        var pers_groups = (await Groups.find({type: "индивидуальная"})).map((g) => g.id);
        trains_where.group = pers_groups
        try {
            let trains = await Trains.find({
                where: trains_where
            }).sort("datetime ASC").populate("members", {select: "toView"})
            
            let trains_groups = [...new Set(trains.map(t => t.group))]
            
            let payment_groups = await Groups.find({id: trains_groups}).populate("members", {select: "toView"})
            let payment_group_by_id = {}
            payment_groups.forEach(payment_group => {
                payment_group_by_id[payment_group.id] = payment_group;
            })
            
            let result = [];
            trains = trains.filter(t => payment_group_by_id[t.group].members.length);
            let pays = await Payments
                    .find({ where: { group: trains_groups, or: [{ starts: { "<": end } }, { ends: { ">=": start } }] } })
                    .sort("starts ASC");

            let pays_min_starts = pays.length ? Math.min(...pays.map(p => p.starts)) : start;
            let pays_max_ends = pays.length ? Math.max(...pays.map(p => p.ends)) : end;
            let in_pays_trains = await Trains.find({ group: trains_groups, datetime: { ">=": pays_min_starts, "<": pays_max_ends } }).sort("datetime ASC").populate("members")
            trains.forEach(async train => {
                let train_visits = []
                let train_group = train.group;
                let train_memebers_ids = train.members.map(tm => tm.id)
                let train_group_members = payment_group_by_id[train_group].members;
                train_group_members.forEach(async train_group_member => {
                    let person_pays = pays.filter(p => p.payer == train_group_member.id && p.group == train.group);
                    let person_in_pays_trains = in_pays_trains.filter(ipt => {
                        let ipt_members = ipt.members.map(iptm => iptm.id)
                        return ipt.group == train.group && ipt_members.includes(train_group_member.id)
                    })
                    train_visits.push({
                        visit: train_memebers_ids.includes(train_group_member.id),
                        name: train_group_member.toView,
                        payment: getPaymentStatus(train, train_group_member, person_pays, person_in_pays_trains ),
                        payment_sum: getPaymentSum(train, train_group_member, person_pays, person_in_pays_trains )
                    })
                });
                result.push({
                    id: train.id,
                    datetime: train.datetime,
                    datetime_end: train.datetime_end,
                    visits: train_visits
                })
            });

            return res.send(result);
        } catch (error) {
            console.log(error)
            return res.status(400).send(error);  
        }

    },
    total: async function(req, res){
        if (req.param("start") && req.param("end")) {
            var group = req.param("group")
            var trener = req.param("trener")
            var start = req.param("start")
            var end = req.param("end")
            var trains_where = {
                datetime: {
                    ">=": start
                },
                datetime_end: {
                    "<=": end
                }
            };
            var pays_where = {
                starts: {
                    ">=": start,
                    "<": end
                }
            };
            if (group) {
                trains_where.group = group
                pays_where.group = group
            } 
            if (trener){
                trains_where.trener = trener
                var trener_groups = (await Groups.find({trener: trener, type: "индивидуальная"})).map((g) => g.id);
                trains_where.group = trener_groups
                pays_where.group = trener_groups
            }
            try {
                var trains = await Trains.find({
                    where: trains_where
                }).populate("members", {select: "toView"})
                
                var pays = await Payments.find({
                    where: pays_where
                })
                
                var trains_count = trains.length
                var pays_count = pays.length
                var visits = 0
                var sum = 0
                for (var i = 0; i < trains.length; i++){
                    visits += trains[i].members.length
                }
                for (var i = 0; i < pays.length; i++){
                    sum += pays[i].sum
                }
                return res.send({
                    trains: trains_count,
                    visits: visits,
                    pays: pays_count,
                    sum: sum
                })
            } catch (error) {
                console.log(error)
                return res.status(400).send(error);    
            }            
        } else {
            return res.status(400).send("Parameter start and end is required");
        }
    },
    debt_dates: async function(req, res){
        if (req.param("payer")){
            var payer_id = req.param("payer")
            var find_group_obj = {}
            if (req.param("group")) {
                find_group_obj.id = req.param("group")
            }
            try {
                var payer = await Persons.findOne(payer_id).populate('trains').populate('groups', find_group_obj)
                var groups_data = await Groups.find(find_group_obj)
                var groups = {}
                var payer_groups = {}
                for (var i = 0; i < payer.groups.length; i++){
                    payer_groups[payer.groups[i].id] = payer.groups[i]
                }
                for (var i = 0; i < groups_data.length; i++){
                    groups[groups_data[i].id] = groups_data[i]
                }
                for (let i = 0; i < payer.trains.length; i++) {
                    payer.trains[i].group = groups[payer.trains[i].group]
                }
                
                var trains = payer.trains.sort(function(a, b) {
                    return parseFloat(a.datetime) - parseFloat(b.datetime);
                })
                var payments = await Payments.find({payer: payer_id}).populate('group').sort("starts DESC")
                var group_dates = {}
                var personal_dates = {}
                var sbor_dates = {}
                var cash_dates = {}
                var once_pays = {}
                var abon_pays = {}
                var once_trains = {}
                for (var group_id in payer_groups){
                    if (payer_groups[group_id].type == "сбор денег"){
                        var date = new Date();
                        cash_dates[group_id] = {
                            starts: date.getTime(),
                            ends: date.getTime()
                        }
                    }
                }
                for (var i = 0; i < trains.length; i++){
                    if (trains[i].group && trains[i].group.type && trains[i].group.id){
                        if (trains[i].group.type == "групповая"){
                            if (groups[trains[i].group.id].once_sum){
                                for (var k = 0; k < payments.length; k++){
                                    if (payments[k].group == null) continue;
                                    var paymet_group_id = payments[k].group.id
                                    if (paymet_group_id && paymet_group_id == trains[i].group.id && payments[k].starts <= trains[i].datetime && payments[k].ends >= trains[i].datetime_end){
                                        if (payments[k].type == "разовый"){
                                            if (!once_pays[paymet_group_id]) once_pays[paymet_group_id] = []
                                            once_pays[paymet_group_id].push({
                                                datetime: trains[i].datetime,
                                                datetime_end: trains[i].datetime_end
                                            })
                                        }
                                        if (payments[k].type == "абонемент"){
                                            if (payments[k].count){
                                                if (!abon_pays[paymet_group_id]) abon_pays[paymet_group_id] = []
                                                var tmp_obj = {
                                                    starts: payments[k].starts,
                                                    ends: payments[k].ends,
                                                    count: payments[k].count
                                                }
                                                var finded = false
                                                for (var m = 0; m < abon_pays[paymet_group_id].length; m++){
                                                    if (JSON.stringify(abon_pays[paymet_group_id][m]) == JSON.stringify(tmp_obj)) finded = true
                                                }
                                                if (!finded) abon_pays[paymet_group_id].push(tmp_obj)
                                            }
                                        }
                                    }
                                }
                            } 
                            var pay_date = new Date(trains[i].datetime)
                            pay_date = new Date(pay_date.getFullYear(), pay_date.getMonth(), 1).getTime()
                            var end_date = new Date(pay_date)
                            end_date.setMonth(end_date.getMonth()+1)
                            end_date = end_date.getTime()
                            if (!group_dates[trains[i].group.id]) group_dates[trains[i].group.id] = []
                            var dates_finded = false 
                            var cur_group_dates = group_dates[trains[i].group.id];
                            for (var k = 0; k < cur_group_dates.length; k++){
                                if (cur_group_dates[k].datetime == pay_date && cur_group_dates[k].datetime_end == end_date){
                                    dates_finded = true
                                }
                            }
                            if (!dates_finded){
                                group_dates[trains[i].group.id].push({
                                    datetime: pay_date,
                                    datetime_end: end_date
                                })
                            }
                        }
                        if (trains[i].group.type == "индивидуальная"){
                            if (!personal_dates[trains[i].group.id]) personal_dates[trains[i].group.id] = []
                            personal_dates[trains[i].group.id].push({
                                starts: trains[i].datetime,
                                ends: trains[i].datetime_end
                            })
                        }
                        if (trains[i].group.type == "сборы"){
                            if (!sbor_dates[trains[i].group.id]){
                                sbor_dates[trains[i].group.id] = { 
                                    starts: trains[i].datetime,
                                    ends: trains[i].datetime_end
                                }
                            } else {
                                if (trains[i].datetime < sbor_dates[trains[i].group.id].starts){
                                    sbor_dates[trains[i].group.id].starts = trains[i].datetime;
                                }
                                if (trains[i].datetime_end > sbor_dates[trains[i].group.id].ends){
                                    sbor_dates[trains[i].group.id].ends = trains[i].datetime_end;
                                } 
                            }
                        }
                    }
                }
                for (var group_id in once_pays){
                    if (groups[group_id].once_sum){
                        for (var i = 0; i < once_pays[group_id].length; i++){
                            var months_start = new Date(once_pays[group_id][i].datetime)
                            months_start = new Date(months_start.getFullYear(), months_start.getMonth(), 1).getTime()
                            var months_end = new Date(months_start)
                            months_end.setMonth(months_end.getMonth()+1)
                            months_end = months_end.getTime()
                            for (var j=group_dates[group_id].length-1; j >= 0; j--){
                                if (group_dates[group_id][j].datetime == months_start && group_dates[group_id][j].datetime_end == months_end){
                                    group_dates[group_id].splice(j,1)
                                }
                            }
                        }
                        for (var j=0; j < trains.length; j++){
                            if (trains[j].group && trains[j].group.id == group_id && trains[j].datetime >= months_start  && trains[j].datetime_end <= months_end){
                                if (!once_trains[group_id]) once_trains[group_id] = []
                                var train_finded = false
                                var tmp_obj = {
                                    train: trains[j].id,  
                                    datetime: trains[j].datetime,
                                    datetime_end: trains[j].datetime_end,
                                    once: true
                                }
                                for (var m=0; m < once_trains[group_id].length; m++){
                                    if (once_trains[group_id][m].train == tmp_obj.train){
                                        train_finded = true
                                    }
                                }
                                if (!train_finded) once_trains[group_id].push(tmp_obj)
                            }
                        }
                    }                    
                }
                for (var group_id in abon_pays){
                    for (var i = 0; i < abon_pays[group_id].length; i++){
                        if (abon_pays[group_id][i].count){
                            var months_start = new Date(abon_pays[group_id][i].starts).getMonth()
                            var months_end = new Date(abon_pays[group_id][i].ends)
                            months_end.setSeconds(months_end.getSeconds()-1)
                            months_end = months_end.getMonth()
                            for (var j=group_dates[group_id].length-1; j >= 0; j--){
                                var start_month = new Date(group_dates[group_id][j].datetime).getMonth() 
                                var end_month = new Date(group_dates[group_id][j].datetime_end).getMonth() 
                                if ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)){
                                    group_dates[group_id].splice(j,1)
                                }
                            }
                        }
                    }
                    for (var i = 0; i < abon_pays[group_id].length; i++){
                        var months_start = new Date(abon_pays[group_id][i].starts).getMonth()
                        var months_end = new Date(abon_pays[group_id][i].ends)
                        months_end.setSeconds(months_end.getSeconds()-1)
                        months_end = months_end.getMonth()
                        var tmp = 0;
                        var in_abon_range_count = 0
                        if (abon_pays[group_id][i].count) in_abon_range_count = abon_pays[group_id][i].count
                        for (var j=0; j < trains.length; j++){
                            var start_month = new Date(trains[j].datetime).getMonth() 
                            var end_month = new Date(trains[j].datetime_end).getMonth() 
                            if (trains[j].group && trains[j].group.id == group_id && ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)) && abon_pays[group_id][i].count){
                                if (!once_trains[group_id]) once_trains[group_id] = []
                                if (!(trains[j].datetime >= abon_pays[group_id][i].starts && trains[j].datetime_end <= abon_pays[group_id][i].ends)){
                                    in_abon_range_count--
                                }
                                for (var m = once_trains[group_id].length-1; m >= 0; m--){
                                    if (once_trains[group_id][m].train == trains[j].id){
                                        once_trains[group_id].splice(m,1)
                                    }
                                } 
                                if (tmp >= in_abon_range_count){
                                    var train_finded = false
                                    var tmp_obj = {
                                        train: trains[j].id,  
                                        datetime: trains[j].datetime,
                                        datetime_end: trains[j].datetime_end,
                                        once: true
                                    }
                                    for (var m=0; m < once_trains[group_id].length; m++){
                                        if (once_trains[group_id][m].train == tmp_obj.train){
                                            train_finded = true
                                        }
                                    }
                                    if (!train_finded) once_trains[group_id].push(tmp_obj)                                       
                                }
                                tmp++
                            }                          
                        }
                    }                                
                }
                for (var i = payments.length-1; i >= 0; i--){
                    if (payments[i].type == "абонемент") payments.splice(i,1)
                }
                for (var group_id in once_trains){
                    if (groups[group_id].once_sum){
                        if (!group_dates[group_id]) group_dates[group_id] = []
                        for (var i = 0; i < once_trains[group_id].length; i++){
                            group_dates[group_id].push(once_trains[group_id][i]);
                        }
                    }                    
                }
                for (var i=0; i<payments.length; i++){
                    var payment_group = payments[i].group
                    if(payment_group && payment_group.type){
                        if (payment_group.type == "групповая"){
                            if (group_dates[payment_group.id] && group_dates[payment_group.id].length){
                                for (var j=group_dates[payment_group.id].length-1; j>=0; j--){
                                    if (payments[i].starts <= group_dates[payment_group.id][j].datetime && payments[i].ends >= group_dates[payment_group.id][j].datetime_end){
                                        group_dates[payment_group.id].splice(j,1)
                                    }
                                }
                            }              
                        }
                        if (payment_group.type == "индивидуальная"){
                            if (personal_dates[payment_group.id] && personal_dates[payment_group.id].length){
                                for (var j=personal_dates[payment_group.id].length-1; j>=0; j--){
                                    if (payments[i].starts <= personal_dates[payment_group.id][j].starts && payments[i].ends >= personal_dates[payment_group.id][j].ends){
                                        personal_dates[payment_group.id].splice(j,1)
                                    }
                                }
                            }                 
                        }
                        if (payment_group.type == "сборы"){
                            if (sbor_dates[payment_group.id]) {
                                if (payments[i].starts <= sbor_dates[payment_group.id].starts && payments[i].ends >= sbor_dates[payment_group.id].ends){
                                    delete sbor_dates[payment_group.id]
                                }
                            }                  
                        }
                        if (payment_group.type == "сбор денег"){
                            if (cash_dates[payment_group.id]) {
                                delete cash_dates[payment_group.id]
                            }                  
                        }
                    }
                }
                var result = [];
                for (var prop in group_dates){
                    for (var i = 0; i < group_dates[prop].length; i++){
                        if (!group_dates[prop][i].once){
                            var starts_date = new Date(group_dates[prop][i].datetime)
                            result.push({group: prop, toView: groups[prop].toView+" ("+months_names[starts_date.getMonth()]+")", starts: group_dates[prop][i].datetime, ends: group_dates[prop][i].datetime_end})    
                        } else {
                            var toView = groups[prop].toView;
                            for (var j=0; j < trains.length; j++) {
                                if (trains[j].datetime >= group_dates[prop][i].datetime && trains[j].datetime_end <= group_dates[prop][i].datetime_end && trains[j].group.id == prop){
                                    toView = trains[j].toView
                                }
                            }
                            result.push({group: prop, toView: toView, starts: group_dates[prop][i].datetime, ends: group_dates[prop][i].datetime_end, train: group_dates[prop][i].train, once: true})
                        }                        
                    }
                } 
                for (var prop in personal_dates){
                    for (var i = 0; i < personal_dates[prop].length; i++){
                        var toView = groups[prop].toView;
                        for (var j=0; j < trains.length; j++) {
                            if (trains[j].datetime >= personal_dates[prop][i].starts && trains[j].datetime_end <= personal_dates[prop][i].ends && trains[j].group.id == prop){
                                toView = trains[j].toView
                            }
                        }
                        result.push({group: prop, toView: toView, starts: personal_dates[prop][i].starts, ends: personal_dates[prop][i].ends})
                    }
                } 
                for (var prop in sbor_dates){
                    result.push({group: prop, toView: groups[prop].toView, starts: sbor_dates[prop].starts, ends: sbor_dates[prop].ends})
                }
                for (var prop in cash_dates){
                    result.push({group: prop, toView: payer_groups[prop].toView, starts: cash_dates[prop].starts, ends: cash_dates[prop].ends})
                }
                return res.send(result);
            } catch (error) { 
                console.log(error);
                return res.status(400).send(error);
            }
        } else {
            return res.status(400).send("Parameter payer is required");
        }
    },
    debts: async function(req, res){
        let selected_groups = req.param("groups");
        if (!selected_groups) return res.status(400).send('Attribute groups is required!');
        selected_groups = selected_groups.split(",");
        try {
            var groups_data = await Groups.find({id: selected_groups}).populate("members")
            var trains = await Trains.find({group: selected_groups}).sort("datetime ASC").populate("members")
            var payments = await Payments.find({group: selected_groups}).sort("starts ASC").populate("group")
            
            var persons = {};
            var groups = {};
            var result = {};
            var group_names = {};
            var group_dates = {};
            var personal_dates = {};
            var sbor_dates = {};
            var group_trains = {};
            var all_groups_members = {}
            for (var i = 0; i < groups_data.length; i++){
                groups[groups_data[i].id] = groups_data[i];
                var group_members = groups_data[i].members;
                group_members.forEach(member => {
                    all_groups_members[member.id] = member;
                });
            }
            var once_pays = {};
            var once_trains = {};

            var abon_pays = {};
            for (var i = 0; i < trains.length; i++){
                let train = trains[i];
                var train_memebers = train.members;
                if (groups[train.group].type == "групповая"){
                    for (var j=0; j < train_memebers.length; j++){
                        let train_memeber = train_memebers[j]
                        var member_id = train_memeber.id;
                        for (var k = 0; k < payments.length; k++){
                            let payment = payments[k];
                            if (payment.group == null) continue;
                            var payment_group_id = payment.group.id
                            if (payment.payer == member_id && payment_group_id == train.group && payment.starts <= train.datetime && payment.ends >= train.datetime_end){
                                if (payment.type == "разовый"){
                                    if (groups[payment_group_id].once_sum){
                                        if (!once_pays[train_memeber.id]) once_pays[train_memeber.id] = {}
                                        if (!once_pays[train_memeber.id][payment_group_id]) once_pays[train_memeber.id][payment_group_id] = []
                                        once_pays[train_memeber.id][payment_group_id].push({
                                            datetime: train.datetime,
                                            datetime_end: train.datetime_end
                                        })
                                    }
                                }
                                if (payment.type == "абонемент"){
                                    if (payment.count){
                                        if (!abon_pays[train_memeber.id]) abon_pays[train_memeber.id] = {}
                                        if (!abon_pays[train_memeber.id][payment_group_id]) abon_pays[train_memeber.id][payment_group_id] = []
                                        var tmp_obj = {
                                            starts: payment.starts,
                                            ends: payment.ends,
                                            count: payment.count
                                        }
                                        var finded = false
                                        for (var m = 0; m < abon_pays[train_memeber.id][payment_group_id].length; m++){
                                            if (JSON.stringify(abon_pays[train_memeber.id][payment_group_id][m]) == JSON.stringify(tmp_obj)){
                                                finded = true;
                                                break;
                                            } 
                                        }
                                        if (!finded) abon_pays[train_memeber.id][payment_group_id].push(tmp_obj)
                                    }
                                }                           
                            }                           
                        }
                        if (!group_dates[train_memeber.id]) group_dates[train_memeber.id] = {}
                        if (!group_dates[train_memeber.id][train.group]) group_dates[train_memeber.id][train.group] = []
                        var pay_date = new Date(train.datetime)
                        pay_date = new Date(pay_date.getFullYear(), pay_date.getMonth(), 1).getTime()
                        var end_date = new Date(pay_date)
                        end_date.setMonth(end_date.getMonth()+1)
                        end_date = end_date.getTime()
                        var dates_finded = false 
                        var cur_group_dates = group_dates[train_memeber.id][train.group];
                        for (var k = 0; k < cur_group_dates.length; k++){
                            if (cur_group_dates[k].datetime == pay_date && cur_group_dates[k].datetime_end == end_date){
                                dates_finded = true;
                                break;
                            }
                        }
                        if (!dates_finded){
                            group_dates[train_memeber.id][train.group].push({
                                datetime: pay_date,
                                datetime_end: end_date
                            })
                        }                            
                    }
                }
                if (groups[train.group].type == "индивидуальная"){
                    for (var j=0; j < train_memebers.length; j++){
                        let train_memeber = train_memebers[j]
                        if (!personal_dates[train_memeber.id]) personal_dates[train_memeber.id] = {}
                        if (!personal_dates[train_memeber.id][train.group]) personal_dates[train_memeber.id][train.group] = []
                        personal_dates[train_memeber.id][train.group].push({
                            datetime: train.datetime,
                            datetime_end: train.datetime_end
                        })
                    }
                }
                if (groups[train.group].type == "сборы"){
                    if (!sbor_dates[train.group]){
                        sbor_dates[train.group] = { 
                            starts: train.datetime,
                            ends: train.datetime_end
                        }
                    } else {
                        if (train.datetime < sbor_dates[train.group].starts){
                            sbor_dates[train.group].starts = train.datetime;
                        }
                        if (train.datetime_end > sbor_dates[train.group].ends){
                            sbor_dates[train.group].ends = train.datetime_end;
                        } 
                    }
                }
                if (!group_trains[train.group]) group_trains[train.group] = []; 
                group_trains[train.group].push(train)
            }
            for (var person_id in once_pays){
                var person_once_pays = once_pays[person_id]
                for (var group_id in person_once_pays){
                    if (groups[group_id].once_sum){
                        for (var i = 0; i < person_once_pays[group_id].length; i++){
                            var months_start = new Date(person_once_pays[group_id][i].datetime)
                            months_start = new Date(months_start.getFullYear(), months_start.getMonth(), 1).getTime()
                            var months_end = new Date(months_start)
                            months_end.setMonth(months_end.getMonth()+1)
                            months_end = months_end.getTime()
                            for (var j=group_dates[person_id][group_id].length-1; j >= 0; j--){
                                if (group_dates[person_id][group_id][j].datetime == months_start && group_dates[person_id][group_id][j].datetime_end == months_end){
                                    group_dates[person_id][group_id].splice(j,1)
                                }
                            }
                        }
                        for (var j=0; j < trains.length; j++){
                            let train = trains[j];
                            var train_memebers = train.members 
                            for (var k=0; k < train_memebers.length; k++){
                                let train_memeber = train_memebers[k];
                                if (train_memeber.id == person_id && train.group == group_id && train.datetime >= months_start  && train.datetime_end <= months_end){
                                    if (!once_trains[person_id]) once_trains[person_id] = {}
                                    if (!once_trains[person_id][group_id]) once_trains[person_id][group_id] = []
                                    var tmp_obj = {
                                        train: train.id,  
                                        datetime: train.datetime,
                                        datetime_end: train.datetime_end,
                                        once: true
                                    }
                                    once_trains[person_id][group_id].push(tmp_obj)
                                }
                            }
                        }
                    }                    
                }
            }
            for (var person_id in abon_pays){
                var person_abon_pays = abon_pays[person_id]
                for (var group_id in person_abon_pays){
                    for (var i = 0; i < person_abon_pays[group_id].length; i++){
                        if (!person_abon_pays[group_id][i].count) continue;
                        var months_start = new Date(person_abon_pays[group_id][i].starts).getMonth()
                        var months_end = new Date(person_abon_pays[group_id][i].ends)
                        months_end.setSeconds(months_end.getSeconds()-1)
                        months_end = months_end.getMonth()
                        for (var j=group_dates[person_id][group_id].length-1; j >= 0; j--){
                            let group_trains_date_ranges = group_dates[person_id][group_id][j];
                            var start_month = new Date(group_trains_date_ranges.datetime).getMonth() 
                            var end_month = new Date(group_trains_date_ranges.datetime_end).getMonth() 
                            if ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)){
                                group_dates[person_id][group_id].splice(j,1)
                            }
                        }
                    }
                    for (var i = 0; i < person_abon_pays[group_id].length; i++){
                        let person_abon_pays_grouppay = person_abon_pays[group_id][i];
                        var months_start = new Date(person_abon_pays_grouppay.starts).getMonth()
                        var months_end = new Date(person_abon_pays_grouppay.ends)
                        months_end.setSeconds(months_end.getSeconds()-1)
                        months_end = months_end.getMonth()
                        var tmp = 0;
                        var in_abon_range_count = 0
                        if (person_abon_pays_grouppay.count) in_abon_range_count = person_abon_pays_grouppay.count
                        
                        for (var j=0; j < trains.length; j++){
                            let train = trains[j]
                            var train_memebers = train.members 
                            var start_month = new Date(train.datetime).getMonth() 
                            var end_month = new Date(train.datetime_end).getMonth() 
                            for (var k=0; k < train_memebers.length; k++){
                                let train_memeber = train_memebers[k]
                                if (train_memeber.id == person_id && train.group == group_id && ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)) && person_abon_pays_grouppay.count){
                                    if (!once_trains[person_id]) once_trains[person_id] = {}
                                    if (!once_trains[person_id][group_id]) once_trains[person_id][group_id] = []
                                    for (var m=once_trains[person_id][group_id].length-1 ; m >= 0; m--){
                                        if (once_trains[person_id][group_id][m].train == trains[j].id){
                                            once_trains[person_id][group_id].splice(m,1)
                                        }
                                    }
                                    
                                    if (!(train.datetime >= person_abon_pays_grouppay.starts && train.datetime_end <= person_abon_pays_grouppay.ends)){
                                        in_abon_range_count--
                                    } 
                                    if (tmp >= in_abon_range_count){
                                        var train_finded = false
                                        var tmp_obj = {
                                            train: train.id,  
                                            datetime: train.datetime,
                                            datetime_end: train.datetime_end,
                                            once: true
                                        }
                                        for (var m=0; m<once_trains[person_id][group_id].length; m++){
                                            if (once_trains[person_id][group_id][m].train == tmp_obj.train){
                                                train_finded = true;
                                                break;
                                            }
                                        }
                                        if (!train_finded) once_trains[person_id][group_id].push(tmp_obj)                                
                                    }
                                    tmp++
                                }
                            }                            
                        }
                    }                                
                }
            }
            for (var i = payments.length-1; i >= 0; i--){
                if (payments[i].type == "абонемент") payments.splice(i,1)
            }
            for (var person_id in once_trains){
                for (var group_id in once_trains[person_id]){
                    if (!groups[group_id].once_sum) continue;
                    if (!group_dates[person_id]) group_dates[person_id] = {}
                    if (!group_dates[person_id][group_id]) group_dates[person_id][group_id] = []
                    for (var i = 0; i < once_trains[person_id][group_id].length; i++){
                        group_dates[person_id][group_id].push(once_trains[person_id][group_id][i]);
                    }                 
                }
            }
            for (var group_id in groups){
                var group_members = groups[group_id].members;   
                if (!group_names[group_id]) group_names[group_id] = groups[group_id].toView;
                for (var i=0; i<group_members.length; i++){
                    let group_member = group_members[i];
                    if (!result[group_member.id]) result[group_member.id] = {} 
                    if (!persons[group_member.id]) persons[group_member.id] = group_member.toView;
                    result[group_member.id][group_id] = 0
                    if (!groups[group_id].sum) continue;
                    if (groups[group_id].type == "групповая" && group_dates[group_member.id] && group_dates[group_member.id][group_id] && groups[group_id].sum){
                        result[group_member.id][group_id] = group_dates[group_member.id][group_id].length * groups[group_id].sum 
                        if (once_trains[group_member.id] && once_trains[group_member.id][group_id] && once_trains[group_member.id][group_id].length && groups[group_id].once_sum) {
                            result[group_member.id][group_id] -= once_trains[group_member.id][group_id].length * groups[group_id].sum
                            result[group_member.id][group_id] += once_trains[group_member.id][group_id].length * groups[group_id].once_sum
                        }
                        for (var j=0; j<group_dates[group_member.id][group_id].length; j++){
                            if (!group_dates[group_member.id][group_id][j].once){
                                var finded = false;
                                for (var k=0; k<group_trains[group_id].length; k++){
                                    if ((group_trains[group_id][k].datetime >= group_dates[group_member.id][group_id][j].datetime) && (group_trains[group_id][k].datetime_end <= group_dates[group_member.id][group_id][j].datetime_end)){
                                        for (var m=0; m < group_trains[group_id][k].members.length; m++){
                                            if (group_trains[group_id][k].members[m].id == group_member.id) finded = true;
                                        }
                                    }
                                }
                                if (!finded) result[group_member.id][group_id] -= groups[group_id].sum
                            }                                    
                        }  
                    }
                    if (groups[group_id].type == "сбор денег"){
                        result[group_member.id][group_id] = groups[group_id].sum;
                    }
                    if (groups[group_id].type == "индивидуальная" && personal_dates[group_member.id] && personal_dates[group_member.id][group_id] && groups[group_id].sum){
                        result[group_member.id][group_id] = personal_dates[group_member.id][group_id].length * groups[group_id].sum;                         
                    }
                    if (groups[group_id].type == "сборы" && sbor_dates[group_id] && groups[group_id].sum){
                        result[group_member.id][group_id] = groups[group_id].sum
                        var finded = false;
                        for (var k=0; k<group_trains[group_id].length; k++){
                            if ((group_trains[group_id][k].datetime >= sbor_dates[group_id].starts) && (group_trains[group_id][k].datetime_end <= sbor_dates[group_id].ends)){
                                for (var m=0; m < group_trains[group_id][k].members.length; m++){
                                    if (group_trains[group_id][k].members[m].id == group_member.id) finded = true 
                                }
                            }
                        }
                        if (!finded) result[group_member.id][group_id] -= groups[group_id].sum                          
                    }
                }
            }
            for (var i=0; i < payments.length; i++){
                let payment = payments[i];
                if (payment.group == null) continue;
                var payment_group_id = payment.group.id
                if (payment.payer){
                    if (groups[payment_group_id].type == "сбор денег"){
                        result[payment.payer][payment_group_id] -= payment.sum
                    }
                    if (groups[payment_group_id].type == "групповая"){
                        if (group_dates[payment.payer] && group_dates[payment.payer][payment_group_id] && group_dates[payment.payer][payment_group_id].length){
                            for (var j=0; j<group_dates[payment.payer][payment_group_id].length; j++){
                                if (payment.starts <= group_dates[payment.payer][payment_group_id][j].datetime && payment.ends >= group_dates[payment.payer][payment_group_id][j].datetime_end){
                                    if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                                    if (!group_dates[payment.payer][payment_group_id][j].once){
                                        result[payment.payer][payment_group_id] -= groups[payment_group_id].sum
                                    } else {
                                        result[payment.payer][payment_group_id] -= groups[payment_group_id].once_sum
                                    }
                                }
                            }
                        } else {
                            if (!result[payment.payer]) result[payment.payer] = {};
                            if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                            result[payment.payer][payment_group_id] -= payment.sum
                        }               
                    }
                    if (groups[payment_group_id].type == "индивидуальная"){
                        if (personal_dates[payment.payer] && personal_dates[payment.payer][payment_group_id] && personal_dates[payment.payer][payment_group_id].length){
                            for (var j=0; j<personal_dates[payment.payer][payment_group_id].length; j++){
                                if (payment.starts <= personal_dates[payment.payer][payment_group_id][j].datetime && payment.ends >= personal_dates[payment.payer][payment_group_id][j].datetime_end){
                                    if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                                    result[payment.payer][payment_group_id] -= groups[payment_group_id].sum
                                }
                            }
                        } else {
                            if (!result[payment.payer]) result[payment.payer] = {};
                            if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                            result[payment.payer][payment_group_id] -= payment.sum
                        }                    
                    }
                    if (groups[payment_group_id].type == "сборы"){
                        if (sbor_dates[payment_group_id]) {
                            if (payment.starts <= sbor_dates[payment_group_id].starts && payment.ends >= sbor_dates[payment_group_id].ends){
                                if (!result[payment.payer]) result[payment.payer] = {};
                                if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                                result[payment.payer][payment_group_id] -= groups[payment_group_id].sum
                            }
                        } else {
                            if (!result[payment.payer]) result[payment.payer] = {};
                            if (!result[payment.payer][payment_group_id]) result[payment.payer][payment_group_id] = 0;
                            result[payment.payer][payment_group_id] -= payment.sum
                        }                    
                    }
                }
            }
            var toSheet = {};
            for (var person_id in result){
                if (!persons[person_id])
                    continue;

                toSheet[persons[person_id]] = {};
                let person_total = 0;
                for (var group_id in result[person_id]){
                    let group_sum = result[person_id][group_id] > 0 ? result[person_id][group_id] : 0 
                    toSheet[persons[person_id]][group_names[group_id]] = group_sum
                    person_total += group_sum
                }
                if (Number(all_groups_members[person_id].debt)){
                    toSheet[persons[person_id]]["Долг"] = Number(all_groups_members[person_id].debt)
                    person_total += Number(all_groups_members[person_id].debt)
                }
                toSheet[persons[person_id]]["Всего"] = person_total
            }
            let ordered = {}
            Object.keys(toSheet).sort().forEach(function(key) {
                ordered[key] = toSheet[key];
            });
            return res.send(ordered);
        } catch (error) { 
            console.log(error);
            return res.status(400).send(error); 
        }
    },
    get_words: function(req, res){
        fs.readFile(words_path, 'utf8', function (err, data) {
            if (err) return res.status(400).send(err);
            return res.send(JSON.parse(data))
        });
    },
    set_words: function(req, res){
        if (!req.param("train")) return res.status(400).send("Parameter train is required");
        if (!req.param("trener")) return res.status(400).send("Parameter trener is required");
        if (!req.param("course")) return res.status(400).send("Parameter course is required");
        fs.readFile(words_path, 'utf8', function (err, data) {
            if (err) return res.status(400).send(err);
            var words = {}
            for (var attr in transform){
                var tmp = transform[attr][req.param(attr)]
                for (var prop in tmp){
                    words[prop] = tmp[prop]
                }
            }            
            fs.writeFile(words_path, JSON.stringify(words, null, 4), 'utf8', function (err, data) {
                if (err) return res.status(400).send(err);
                return res.ok();
            });
        });
    },
    get_visits: async function(req, res){
        try {
            let group_id = req.param("group_id");
            let start = Number(req.param("start"));
            let end = Number(req.param("end"));

            if (!group_id || !start || !end) return res.status(400).send("group_id, start and end is required")
            let trains = await Trains.find({ group: group_id, datetime: { ">=": start, "<": end } }).sort("datetime ASC").populate("members")
            let group = await Groups.findOne(group_id).populate("members")
            let group_members = group.members;
            let pays = await Payments.find({ where: { group: group_id, or: [{ starts: { "<": end } }, { ends: { ">=": start } }] } }).sort("starts ASC")
            let pays_min_starts = pays.length == 0 ? start : Math.min(...pays.map(p => p.starts));
            let pays_max_ends = pays.length == 0 ? end : Math.max(...pays.map(p => p.ends));
            let in_pays_trains = await Trains.find({ group: group_id, datetime: { ">=": pays_min_starts, "<": pays_max_ends } }).sort("datetime ASC").populate("members")
            
            let result = {}
            for (let i = 0; i < group_members.length; i++) {
                const person = group_members[i];
                let person_name = person.toView; 
                let person_id = person.id; 
                let person_pays = pays.filter((p) => p.payer == person_id )
                result[person_name] = {}
                let total_visits = 0
                for (let j = 0; j < trains.length; j++) {
                    const train = trains[j];
                    let train_memebers = train.members
                    let train_memebers_ids = train_memebers.map((tm)=>tm.id)
                    let train_start = train.datetime;
                    let is_visit = train_memebers_ids.includes(person_id)
                    if (is_visit) total_visits++;
                    result[person_name][train_start] = {
                        visit: is_visit,
                        payment: getPaymentStatus( train, person, person_pays, in_pays_trains)
                    };
                }
                result[person_name]["Всего"] = total_visits
            }
            let ordered = {}
            Object.keys(result).sort().forEach(function(key) {
                ordered[key] = result[key];
            });
            return res.send(ordered);
        } catch (error) {
            console.log(error)
            return res.status(400).send(error)
        }
    },
    get_birthdays: function(req, res){
        let today = new Date();
        var db = Persons.getDatastore().manager;
        var rawMongoCollection = db.collection(Persons.tableName);
        rawMongoCollection.find({
            $where: `return new Date(this.birthday).getDate() === ${today.getDate()} && new Date(this.birthday).getMonth() === ${today.getMonth()}`
        }, {
            toView: true,
            birthday: true
        }).toArray(function (err, results) {
            if (err) return res.serverError(err);
            results = results.map(r => `${r.toView} (${birthDateToAge(r.birthday)} лет)` );
            return res.ok(results);
        });
    },
    get_treners: async function(req, res){
        let db = Trains.getDatastore().manager;
        let trainsMongoCollection = db.collection(Trains.tableName);
        let personsMongoCollection = db.collection(Persons.tableName);
        try {
            let trener_ids = await trainsMongoCollection.distinct("trener")
            let treners = await personsMongoCollection.find({_id: {$in: trener_ids}},{toView: true}).toArray()
            return res.send(treners)
        } catch (error) {
            return res.serverError(error);
        }
    }
}

function birthDateToAge(birthDate) {
    birthDate = new Date(birthDate);

    var now = new Date(),
        age = now.getFullYear() - birthDate.getFullYear();

    return now.setFullYear(1972) < birthDate.setFullYear(1972) ? age - 1 : age;
}

function getPaymentStatus( current_train, person, pays, trains){
    if (!pays.length) return false;

    let train_start = current_train.datetime;
    let train_end = current_train.datetime_end;
    
    for (let i = 0; i < pays.length; i++) {
        const pay = pays[i];
        let train_in_pay = (train_start >= pay.starts) && (train_end <= pay.ends)
        if (!train_in_pay) continue;
        if (pay.type != "абонемент") return true;
        if (!pay.count) return true;

        let abon_trains = []
        trains.forEach(train => {
            let train_memebers = train.members
            let train_memebers_ids = train_memebers.map((tm)=>tm.id)
            let is_visit = train_memebers_ids.includes(person.id)
            let train_in_pay = (train.start >= pay.starts) && (train.end <= pay.ends)
            if (train_in_pay && is_visit) {
                abon_trains.push(train.id)
            }
        });
        return pay.count > abon_trains.indexOf(current_train.id) + 1;
    }
    return false
}

function getPaymentSum( current_train, person, pays, trains){
    if (!pays.length) return 0;
    
    let train_start = current_train.datetime;
    let train_end = current_train.datetime_end;

    for (let i = 0; i < pays.length; i++) {
        const pay = pays[i];
        let train_in_pay = (train_start >= pay.starts) && (train_end <= pay.ends)
        if (!train_in_pay) continue;
        if (pay.type != "абонемент") return pay.sum;
        if (!pay.count) return pay.sum;

        let abon_trains = []
        trains.forEach(train => {
            let train_memebers = train.members
            let train_memebers_ids = train_memebers.map((tm)=>tm.id)
            let is_visit = train_memebers_ids.includes(person.id)
            let train_in_pay = (train.start >= pay.starts) && (train.end <= pay.ends)
            if (train_in_pay && is_visit) {
                abon_trains.push(train.id)
            }
        });
        return pay.count > abon_trains.indexOf(current_train.id) + 1 ? pay.sum : 0;
    }
    return 0
}