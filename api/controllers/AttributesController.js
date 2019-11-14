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
            let find_obj = {}
            if (req.param('model') == 'groups' && !req.param("show_archived")){
                find_obj.in_archive = {"!=": true};
            }
            model.find(find_obj,function(err,data){
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
    personal_report: async function(req, res){
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
                .sort("type DESC");

            let pays_min_starts = pays.length ? Math.min(...pays.map(p => p.starts)) : start;
            let pays_max_ends = pays.length ? Math.max(...pays.map(p => p.ends)) : end;
            let in_pays_trains = await Trains.find({ group: trains_groups, datetime: { ">=": pays_min_starts, "<": pays_max_ends } }).sort("datetime ASC").populate("members")
            trains.forEach(train => {
                let train_visits = []
                let train_group = train.group;
                let train_memebers_ids = train.members.map(tm => tm.id)
                let train_group_members = payment_group_by_id[train_group].members;
                train_group_members.forEach(train_group_member => {
                    let person_pays = pays.filter(p => p.payer == train_group_member.id && p.group == train.group);
                    let person_in_pays_trains = in_pays_trains.filter(ipt => {
                        let ipt_members = ipt.members.map(iptm => iptm.id)
                        return ipt.group == train.group && ipt_members.includes(train_group_member.id)
                    })
                    const payed_train_ids = trains.filter(t => t.payed).map(t => t.id);
                    let current_train_payment = getPayment(train, train_group_member, person_pays, person_in_pays_trains, payed_train_ids )
                    train_visits.push({
                        visit: train_memebers_ids.includes(train_group_member.id),
                        name: train_group_member.toView,
                        payment: current_train_payment != null,
                        payment_sum: current_train_payment ? current_train_payment.sum : 0,
                        payment_id: current_train_payment ? current_train_payment.id : null
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
        if (!req.param("payer")) return res.status(400).send("Parameter payer is required");
        
        const payer_id = req.param("payer")
        let find_group_obj = {}
        if (req.param("group")) {
            find_group_obj.id = req.param("group")
        }
        try {
            let person = await Persons.findOne(payer_id).populate('groups')
            let trains = (await Trains.find().populate('members', {id: payer_id}).sort("datetime ASC")).filter(t => t.members.length > 0)
            let payments = await Payments.find({payer: payer_id}).sort("starts ASC")
            let person_groups = getPersonGroups(person, trains, payments);
            setGroupsDebts(person_groups);
            let result = [];
            person_groups.forEach(pg => {
                pg.debt_dates.forEach(dd => {
                    result.push(dd)
                });
            });
            return res.send(result);
        } catch (error) { 
            console.log(error);
            return res.status(400).send(error);
        }
    },
    debts: async function(req, res){
        let selected_groups = req.param("groups");
        if (!selected_groups) return res.status(400).send('Attribute groups is required!');
        selected_groups = selected_groups.split(",");
        try {
            const trains = await Trains.find({group: selected_groups}).populate("members").sort("datetime ASC")
            const payments = await Payments.find({group: selected_groups}).sort("starts ASC")
            const persons = (await Persons.find().sort("name ASC").populate("groups", {id: selected_groups})).filter(p => p.groups.length > 0);
            let person_infos = getPersonInfos(trains, payments, persons);
            let result = {};
            person_infos.forEach(pi => {
                const groups = pi.groups;
                result[pi.name] = {};
                let sum = 0;
                groups.forEach(group => {
                    result[pi.name][group.label] = group.debt;
                    sum += group.debt; 
                });
                if (pi.debt) {
                    result[pi.name]["Долг"] = pi.debt;
                    sum += pi.debt; 
                }
                result[pi.name]["Всего"] = sum;
            });

            res.send(result);
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
            let group = await Groups.findOne(group_id).populate("members").populate("archived")
            let in_archive = group.archived.map(ia => ia.id);
            let group_members = group.members.filter(m => !in_archive.includes(m.id));

            let pays = await Payments.find({ where: { group: group_id, or: [{ starts: { "<": end } }, { ends: { ">=": start } }] } }).sort("type DESC")
            let pays_min_starts = pays.length ? Math.min(...pays.map(p => p.starts)) : start;
            let pays_max_ends = pays.length ? Math.max(...pays.map(p => p.ends)) : end;
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
                    let train = trains[j];
                    let train_memebers = train.members
                    let train_memebers_ids = train_memebers.map((tm)=>tm.id)
                    let train_start = train.datetime;
                    let is_visit = train_memebers_ids.includes(person_id)
                    if (is_visit) total_visits++;
                    const payed_train_ids = trains.filter(t => t.payed).map(t => t.id);
                    result[person_name][train_start] = {
                        visit: is_visit,
                        payment: getPayment( train, person, person_pays, in_pays_trains, payed_train_ids) != null
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

function getPersonGroups(person, person_trains, person_payments){
    let groups = person.groups.map(g => clone(g));
    groups.forEach(group => {
        group.trains = person_trains.filter(t => t.group == group.id).map(t => clone(t));
        group.payments = person_payments.filter(p => p.group == group.id).map(p => clone(p));
    })
    return groups;
}

function getPersonInfos(trains, payments, persons){
    let person_infos = persons.map(p => {
        const person_trains = trains.filter(t => t.members.some(m => m.id == p.id));
        const person_payments = payments.filter(pay => pay.payer == p.id)
        return {
            id: p.id,
            name: p.name,
            debt: p.debt,
            groups: getPersonGroups(p, person_trains, person_payments)
        }
    });

    person_infos.forEach(person => {
        setGroupsDebts(person.groups);
    });
    return person_infos;
}

function setGroupsDebts(groups){
    groups.forEach(group => {
        const payments = group.payments;
        const abon_pay_ids = payments.filter(p => p.type == "абонемент").map(p => p.id);
        let payed_once_trainmonths = [];
        payments.forEach(payment => {
            group.trains.forEach(train => {
                if (!abon_pay_ids.includes(payment.id) || payment.count == 0) {
                    if (payment.starts <= train.datetime && payment.ends >= train.datetime_end) {
                        train.payed = true;
                        if (payment.type == "разовый" && !payed_once_trainmonths.includes(moment(train.datetime).format("MM-YYYY"))) {
                            payed_once_trainmonths.push(moment(train.datetime).format("MM-YYYY"));
                        } 
                    }
                } else {
                    const in_abon_trains = group.trains
                        .filter(t => payment.starts <= t.datetime && payment.ends >= t.datetime_end)
                        .sort((a,b)=>{
                            if (a.datetime < b.datetime) return -1;
                            if (a.datetime > b.datetime) return 1;
                            return 0;
                        })
                        .map(t => t.id);
                    if (in_abon_trains.includes(train.id)){
                        if (in_abon_trains.indexOf(train.id) <= (payment.count - 1)){
                            train.payed = true;
                        } else {
                            if (!payed_once_trainmonths.includes(moment(train.datetime).format("MM-YYYY"))) {
                                payed_once_trainmonths.push(moment(train.datetime).format("MM-YYYY"));
                            } 
                        }
                    }
                }
            })
        });
        const unpayed_trains = group.trains.filter(t => !t.payed);
        group.debt = 0;
        group.debt_dates = [];
        if (group.type == "групповая"){
            let unpayed_months = [];
            let unpayed_trainmonths = [];
            unpayed_trains.forEach(train => {
                const train_month = moment(train.datetime).format("MM-YYYY");
                if (!unpayed_months.includes(train_month)) {
                    unpayed_months.push(train_month);
                    unpayed_trainmonths.push({name: train_month, trains: []})
                }
                unpayed_trainmonths.find(m => m.name == train_month).trains.push(train);
            });
            unpayed_trainmonths.forEach(tm => {
                const name = tm.name;
                const train_ids = tm.trains.map(t => t.id);
                if (payed_once_trainmonths.includes(name) && group.once_sum) {
                    group.debt += train_ids.length * group.once_sum;
                    tm.trains.forEach(t => group.debt_dates.push({
                        group: group.id,
                        once: true,
                        toView: t.toView,
                        starts: t.datetime,
                        ends: t.datetime_end,
                        train: t.id
                    }));
                } else {
                    group.debt += group.sum;
                    let start_month_moment = moment(name, "MM-YYYY").startOf("month");
                    let starts_date = new Date(start_month_moment.valueOf());
                    const debt_date_name = group.toView+" ("+months_names[starts_date.getMonth()]+")"
                    group.debt_dates.push({
                        group: group.id,
                        toView: debt_date_name,
                        starts: start_month_moment.valueOf(),
                        ends: start_month_moment.add(1, "month").valueOf()
                    })
                }
            });
        }
        if (group.type == "индивидуальная"){
            unpayed_trains.forEach(train => {
                if (train.members.length == 0) {
                    console.log("train.members.length == 0");
                    return
                }
                group.debt += group.sum / train.members.length;
                group.debt_dates.push({
                    group: group.id,
                    toView: train.toView,
                    starts: train.datetime,
                    ends: train.datetime_end
                })
            });
        }
        if (group.type == "сборы"){
            if (unpayed_trains.length > 0) {
                group.debt = group.sum;
                group.debt_dates.push({
                    group: group.id,
                    toView: group.toView,
                    starts: unpayed_trains[0].datetime,
                    ends: unpayed_trains[unpayed_trains.length - 1].datetime_end
                })
            } 
        }
        if (group.type == "сбор денег"){
            if (!group.payments.length) {
                group.debt = group.sum;
                group.debt_dates.push({
                    group: group.id,
                    toView: group.toView,
                    starts: new Date().getTime(),
                    ends: new Date().getTime()
                })
            }
        }
    });
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function getPayment( current_train, person, pays, trains, payed_train_ids ){
    if (!pays.length) return null;
    let train_start = current_train.datetime;
    let train_end = current_train.datetime_end;
    let abon_trains = []
    let abon_pays = [];
    //let not_visited_abon_trains = []
    for (let i = 0; i < pays.length; i++) {
        const pay = pays[i];
        let train_in_pay = (train_start >= pay.starts) && (train_end <= pay.ends)
        if (!train_in_pay) continue;
        if (pay.type != "абонемент" || !pay.count) {
            current_train.payed = true;
            return pay;
        }
        abon_pays.push(pay);
        
        trains.forEach(train => {
            let train_memebers = train.members
            let train_memebers_ids = train_memebers.map((tm)=>tm.id)
            let is_visit = train_memebers_ids.includes(person.id)
            let train_in_pay = (train.datetime >= pay.starts) && (train.datetime_end <= pay.ends)
            if (train_in_pay && is_visit && !payed_train_ids.includes(train.id)) {
                //if (!is_visit) not_visited_abon_trains.push(train.id)
                abon_trains.push(train.id)
            }
        });
    }
    for (let i = 0; i < abon_pays.length; i++) {
        const abon_pay = abon_pays[i];
        const max_index = abon_pay.count - 1;

        const trainIndexLessThanPaysCount = abon_trains.indexOf(current_train.id) >= 0 && max_index >= abon_trains.indexOf(current_train.id);
        return trainIndexLessThanPaysCount ? abon_pay : null;
    }
    return null;
}