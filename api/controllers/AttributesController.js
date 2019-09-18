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
        var sort = "updatedAt DESC";;
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
                    (eval(find_str)).exec(function(err, data){
                        if (err) {
                            console.log("find error");
                            return res.status(400).send(err);
                        } else {
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
    total: async function(req, res){
        if (req.param("start") && req.param("end")) {
            var group = req.param("group")
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
            if (group) trains_where.group = group
            try {
                var trains = await Trains.find({
                    where: trains_where
                }).populate("members", {select: "toView"})
                var pays_where = {
                    starts: {
                        ">=": start,
                        "<": end
                    }
                };
                if (group) pays_where.group = group
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
        try {
            var groups_data = await Groups.find().populate("members")
            var trains = await Trains.find({sort: "datetime ASC"}).populate("members")
            var payments = await Payments.find({sort: "starts ASC"}).populate("group")
            var persons = {};
            var groups = {};
            var result = {};
            var group_names = {};
            var group_dates = {};
            var personal_dates = {};
            var sbor_dates = {};
            var group_trains = {};
            for (var i = 0; i < groups_data.length; i++){
                groups[groups_data[i].id] = groups_data[i];
            }
            var once_pays = {};
            var once_trains = {};

            var abon_pays = {};
            for (var i = 0; i < trains.length; i++){
                var train_memebers = trains[i].members;
                if (groups[trains[i].group].type == "групповая"){
                    for (var j=0; j < train_memebers.length; j++){
                        var member_id = train_memebers[j].id;
                        for (var k = 0; k < payments.length; k++){
                            if (payments[k].group == null) continue;
                            var payment_group_id = payments[k].group.id
                            if (payments[k].payer == member_id && payment_group_id == trains[i].group && payments[k].starts <= trains[i].datetime && payments[k].ends >= trains[i].datetime_end){
                                if (payments[k].type == "разовый"){
                                    if (groups[payment_group_id].once_sum){
                                        if (!once_pays[train_memebers[j].id]) once_pays[train_memebers[j].id] = {}
                                        if (!once_pays[train_memebers[j].id][payment_group_id]) once_pays[train_memebers[j].id][payment_group_id] = []
                                        once_pays[train_memebers[j].id][payment_group_id].push({
                                            datetime: trains[i].datetime,
                                            datetime_end: trains[i].datetime_end
                                        })
                                    }
                                }
                                if (payments[k].type == "абонемент"){
                                    if (payments[k].count){
                                        if (!abon_pays[train_memebers[j].id]) abon_pays[train_memebers[j].id] = {}
                                        if (!abon_pays[train_memebers[j].id][payment_group_id]) abon_pays[train_memebers[j].id][payment_group_id] = []
                                        var tmp_obj = {
                                            starts: payments[k].starts,
                                            ends: payments[k].ends,
                                            count: payments[k].count
                                        }
                                        var finded = false
                                        for (var m = 0; m < abon_pays[train_memebers[j].id][payment_group_id].length; m++){
                                            if (JSON.stringify(abon_pays[train_memebers[j].id][payment_group_id][m]) == JSON.stringify(tmp_obj)) finded = true
                                        }
                                        if (!finded) abon_pays[train_memebers[j].id][payment_group_id].push(tmp_obj)
                                    }
                                }                           
                            }                           
                        }
                        if (!group_dates[train_memebers[j].id]) group_dates[train_memebers[j].id] = {}
                        if (!group_dates[train_memebers[j].id][trains[i].group]) group_dates[train_memebers[j].id][trains[i].group] = []
                        var pay_date = new Date(trains[i].datetime)
                        pay_date = new Date(pay_date.getFullYear(), pay_date.getMonth(), 1).getTime()
                        var end_date = new Date(pay_date)
                        end_date.setMonth(end_date.getMonth()+1)
                        end_date = end_date.getTime()
                        var dates_finded = false 
                        var cur_group_dates = group_dates[train_memebers[j].id][trains[i].group];
                        for (var k = 0; k < cur_group_dates.length; k++){
                            if (cur_group_dates[k].datetime == pay_date && cur_group_dates[k].datetime_end == end_date){
                                dates_finded = true
                            }
                        }
                        if (!dates_finded){
                            group_dates[train_memebers[j].id][trains[i].group].push({
                                datetime: pay_date,
                                datetime_end: end_date
                            })
                        }                            
                    }

                }
                if (groups[trains[i].group].type == "индивидуальная"){
                    for (var j=0; j < train_memebers.length; j++){
                        if (!personal_dates[train_memebers[j].id]) personal_dates[train_memebers[j].id] = {}
                        if (!personal_dates[train_memebers[j].id][trains[i].group]) personal_dates[train_memebers[j].id][trains[i].group] = []
                        personal_dates[train_memebers[j].id][trains[i].group].push({
                            datetime: trains[i].datetime,
                            datetime_end: trains[i].datetime_end
                        })
                    }
                }
                if (groups[trains[i].group].type == "сборы"){
                    if (!sbor_dates[trains[i].group]){
                        sbor_dates[trains[i].group] = { 
                            starts: trains[i].datetime,
                            ends: trains[i].datetime_end
                        }
                    } else {
                        if (trains[i].datetime < sbor_dates[trains[i].group].starts){
                            sbor_dates[trains[i].group].starts = trains[i].datetime;
                        }
                        if (trains[i].datetime_end > sbor_dates[trains[i].group].ends){
                            sbor_dates[trains[i].group].ends = trains[i].datetime_end;
                        } 
                    }
                }
                if (!group_trains[trains[i].group]) group_trains[trains[i].group] = []; 
                group_trains[trains[i].group].push(trains[i])
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
                            var train_memebers = trains[j].members 
                            for (var k=0; k < train_memebers.length; k++){
                                if (train_memebers[k].id == person_id && trains[j].group == group_id && trains[j].datetime >= months_start  && trains[j].datetime_end <= months_end){
                                    if (!once_trains[person_id]) once_trains[person_id] = {}
                                    if (!once_trains[person_id][group_id]) once_trains[person_id][group_id] = []
                                    var tmp_obj = {
                                        train: trains[j].id,  
                                        datetime: trains[j].datetime,
                                        datetime_end: trains[j].datetime_end,
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
                        if (person_abon_pays[group_id][i].count){
                            var months_start = new Date(person_abon_pays[group_id][i].starts).getMonth()
                            var months_end = new Date(person_abon_pays[group_id][i].ends)
                            months_end.setSeconds(months_end.getSeconds()-1)
                            months_end = months_end.getMonth()
                            for (var j=group_dates[person_id][group_id].length-1; j >= 0; j--){
                                
                                var start_month = new Date(group_dates[person_id][group_id][j].datetime).getMonth() 
                                var end_month = new Date(group_dates[person_id][group_id][j].datetime_end).getMonth() 
                                if ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)){
                                    group_dates[person_id][group_id].splice(j,1)
                                }
                            }
                        }
                    }
                    for (var i = 0; i < person_abon_pays[group_id].length; i++){
                        var months_start = new Date(person_abon_pays[group_id][i].starts).getMonth()
                        var months_end = new Date(person_abon_pays[group_id][i].ends)
                        months_end.setSeconds(months_end.getSeconds()-1)
                        months_end = months_end.getMonth()
                        var tmp = 0;
                        var in_abon_range_count = 0
                        if (person_abon_pays[group_id][i].count) in_abon_range_count = person_abon_pays[group_id][i].count
                        
                        for (var j=0; j < trains.length; j++){
                            var train_memebers = trains[j].members 
                            var start_month = new Date(trains[j].datetime).getMonth() 
                            var end_month = new Date(trains[j].datetime_end).getMonth() 
                            for (var k=0; k < train_memebers.length; k++){
                                if (train_memebers[k].id == person_id && trains[j].group == group_id && ((start_month >= months_start && start_month <= months_end)||(end_month >= months_start && end_month <= months_end)) && person_abon_pays[group_id][i].count){
                                    if (!once_trains[person_id]) once_trains[person_id] = {}
                                    if (!once_trains[person_id][group_id]) once_trains[person_id][group_id] = []
                                    for (var m=once_trains[person_id][group_id].length-1 ; m >= 0; m--){
                                        if (once_trains[person_id][group_id][m].train == trains[j].id){
                                            once_trains[person_id][group_id].splice(m,1)
                                        }
                                    }
                                    
                                    if (!(trains[j].datetime >= person_abon_pays[group_id][i].starts && trains[j].datetime_end <= person_abon_pays[group_id][i].ends)){
                                        in_abon_range_count--
                                    } 
                                    if (tmp >= in_abon_range_count){
                                        var train_finded = false
                                        var tmp_obj = {
                                            train: trains[j].id,  
                                            datetime: trains[j].datetime,
                                            datetime_end: trains[j].datetime_end,
                                            once: true
                                        }
                                        for (var m=0; m<once_trains[person_id][group_id].length; m++){
                                            if (once_trains[person_id][group_id][m].train == tmp_obj.train){
                                                train_finded = true
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
                    if (groups[group_id].once_sum){
                        if (!group_dates[person_id]) group_dates[person_id] = {}
                        if (!group_dates[person_id][group_id]) group_dates[person_id][group_id] = []
                        for (var i = 0; i < once_trains[person_id][group_id].length; i++){
                            group_dates[person_id][group_id].push(once_trains[person_id][group_id][i]);
                        }
                    }                    
                }
            }
            for (var group_id in groups){
                var group_members = groups[group_id].members;   
                if (!group_names[group_id]) group_names[group_id] = groups[group_id].toView;
                for (var i=0; i<group_members.length; i++){
                    if (!result[group_members[i].id]) result[group_members[i].id] = {} 
                    if (!persons[group_members[i].id]) persons[group_members[i].id] = group_members[i].toView;
                    result[group_members[i].id][group_id] = 0
                    if (groups[group_id].sum){
                        if (groups[group_id].type == "групповая"){
                            if (group_dates[group_members[i].id] && group_dates[group_members[i].id][group_id] && groups[group_id].sum) {
                                result[group_members[i].id][group_id] = group_dates[group_members[i].id][group_id].length * groups[group_id].sum 
                                if (once_trains[group_members[i].id] && once_trains[group_members[i].id][group_id] && once_trains[group_members[i].id][group_id].length && groups[group_id].once_sum) {
                                    result[group_members[i].id][group_id] -= once_trains[group_members[i].id][group_id].length * groups[group_id].sum
                                    result[group_members[i].id][group_id] += once_trains[group_members[i].id][group_id].length * groups[group_id].once_sum
                                }
                                for (var j=0; j<group_dates[group_members[i].id][group_id].length; j++){
                                    if (!group_dates[group_members[i].id][group_id][j].once){
                                        var finded = false;
                                        for (var k=0; k<group_trains[group_id].length; k++){
                                            if ((group_trains[group_id][k].datetime >= group_dates[group_members[i].id][group_id][j].datetime) && (group_trains[group_id][k].datetime_end <= group_dates[group_members[i].id][group_id][j].datetime_end)){
                                                for (var m=0; m < group_trains[group_id][k].members.length; m++){
                                                    if (group_trains[group_id][k].members[m].id == group_members[i].id) finded = true 
                                                }
                                            }
                                        }
                                        if (!finded) result[group_members[i].id][group_id] -= groups[group_id].sum
                                    }                                    
                                }
                            }  
                        }
                        if (groups[group_id].type == "сбор денег"){
                            result[group_members[i].id][group_id] = groups[group_id].sum;
                        }
                        if (groups[group_id].type == "индивидуальная"){
                            if (personal_dates[group_members[i].id] && personal_dates[group_members[i].id][group_id] && groups[group_id].sum) {
                                result[group_members[i].id][group_id] = personal_dates[group_members[i].id][group_id].length * groups[group_id].sum;            
                            }                            
                        }
                        if (groups[group_id].type == "сборы"){
                            if (sbor_dates[group_id] && groups[group_id].sum) {
                                result[group_members[i].id][group_id] = groups[group_id].sum
                                var finded = false;
                                for (var k=0; k<group_trains[group_id].length; k++){
                                    if ((group_trains[group_id][k].datetime >= sbor_dates[group_id].starts) && (group_trains[group_id][k].datetime_end <= sbor_dates[group_id].ends)){
                                        for (var m=0; m < group_trains[group_id][k].members.length; m++){
                                            if (group_trains[group_id][k].members[m].id == group_members[i].id) finded = true 
                                        }
                                    }
                                }
                                if (!finded) result[group_members[i].id][group_id] -= groups[group_id].sum
                            }                             
                        }
                    }
                    
                }
            }
            for (var i=0; i < payments.length; i++){
                if (payments[i].group == null) continue;
                var payment_group_id = payments[i].group.id
                if (payments[i].payer){
                    if (groups[payment_group_id].type == "сбор денег"){
                        result[payments[i].payer][payment_group_id] -= payments[i].sum
                    }
                    if (groups[payment_group_id].type == "групповая"){
                        if (group_dates[payments[i].payer] && group_dates[payments[i].payer][payment_group_id] && group_dates[payments[i].payer][payment_group_id].length){
                            for (var j=0; j<group_dates[payments[i].payer][payment_group_id].length; j++){
                                if (payments[i].starts <= group_dates[payments[i].payer][payment_group_id][j].datetime && payments[i].ends >= group_dates[payments[i].payer][payment_group_id][j].datetime_end){
                                    if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                                    if (!group_dates[payments[i].payer][payment_group_id][j].once){
                                        result[payments[i].payer][payment_group_id] -= groups[payment_group_id].sum
                                    } else {
                                        result[payments[i].payer][payment_group_id] -= groups[payment_group_id].once_sum
                                    }
                                    
                                }
                            }
                        } else {
                            if (!result[payments[i].payer]) result[payments[i].payer] = {};
                            if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                            result[payments[i].payer][payment_group_id] -= payments[i].sum
                        }               
                    }
                    if (groups[payment_group_id].type == "индивидуальная"){
                        if (personal_dates[payments[i].payer] && personal_dates[payments[i].payer][payment_group_id] && personal_dates[payments[i].payer][payment_group_id].length){
                            for (var j=0; j<personal_dates[payments[i].payer][payment_group_id].length; j++){
                                if (payments[i].starts <= personal_dates[payments[i].payer][payment_group_id][j].datetime && payments[i].ends >= personal_dates[payments[i].payer][payment_group_id][j].datetime_end){
                                    if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                                    result[payments[i].payer][payment_group_id] -= groups[payment_group_id].sum
                                }
                            }
                        } else {
                            if (!result[payments[i].payer]) result[payments[i].payer] = {};
                            if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                            result[payments[i].payer][payment_group_id] -= payments[i].sum
                        }                    
                    }
                    if (groups[payment_group_id].type == "сборы"){
                        if (sbor_dates[payment_group_id]) {
                            if (payments[i].starts <= sbor_dates[payment_group_id].starts && payments[i].ends >= sbor_dates[payment_group_id].ends){
                                if (!result[payments[i].payer]) result[payments[i].payer] = {};
                                if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                                result[payments[i].payer][payment_group_id] -= groups[payment_group_id].sum
                            }
                        } else {
                            if (!result[payments[i].payer]) result[payments[i].payer] = {};
                            if (!result[payments[i].payer][payment_group_id]) result[payments[i].payer][payment_group_id] = 0;
                            result[payments[i].payer][payment_group_id] -= payments[i].sum
                        }                    
                    }
                }
            }
            var toSheet = {};
            for (var person_id in result){
                toSheet[persons[person_id]] = {};
                for (var group_id in result[person_id]){
                    toSheet[persons[person_id]][group_names[group_id]] = result[person_id][group_id]
                }
            }
            return res.send(toSheet);
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
    }
}