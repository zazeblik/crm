var datetimes = ["datetime", "datetime_end", "starts", "ends", "updatedAt", "createdAt"]
var dates = ["birthday"]
var times = ["time", "schedule_1", "schedule_2", "schedule_3", "schedule_4", "schedule_5", "schedule_6", "schedule_7"]
var trenersChart, membersChart, paysChart;
var last_collection = []
var last_models = []

function showModelTable(model, query) {
    $("#table_head").empty();
    $("#table_filters").empty();
    $("#table_body").empty();
    clearBlocks();
    $("#database_block").show();
    $(".select_all_btn").prop("checked", false);
    var model_name = toRU(model)
    if (model == "trains") model_name = window.settings_words.trains;
    $("#table_title").text(model_name)
    $("#data_table").attr("data-model", model);
    if (model == 'persons' || model == 'groups' ) $(".import_model_btn").show()
    else $(".import_model_btn").hide()
    $.ajax({
        url: "/attributes/get?model=" + model,
        success: function (attributes) {
            var fields = [];
            var model_fields = [];
            for (var prop in attributes) {
                let isPersonBirthdayField = prop == "birthday" && model == "persons";
                if (prop != "id" && prop != "createdAt" && prop != "toView" && !attributes[prop].collection) {
                    if (prop == "updatedAt" && model != 'payments') continue;
                    var th_label = toRU(prop);
                    if (prop == "trener") th_label = window.settings_words.trener;
                    if (prop == "trains") th_label = window.settings_words.trains;
                    $("#table_head").append('<th scope="col" data-prop="' + prop + '">' + th_label + '</th>');
                    $("#table_filters").append(`<th>${isPersonBirthdayField ? '' : '<input type="text" data-filter="' + prop + '" class="form-control form-control-sm" />'}</th>`);
                    if (isPersonBirthdayField) {
                        $("#table_head").append('<th scope="col">' + toRU("age") + '</th>');
                        $("#table_filters").append('<th></th>');
                        $("#table_head").append('<th scope="col">' + toRU("age_group") + '</th>');
                        $("#table_filters").append('<th></th>');
                    }
                    setElementEvent($('input[data-filter="' + prop + '"]'), "change", function () {
                        updateLimitTable()
                    });
                    setElementEvent($('th[data-prop="' + prop + '"]'), "click", function () {
                        if (attributes[$(this).attr("data-prop")].type) {
                            if ($(this).attr("sort")) {
                                var sort = $(this).attr("sort") == "DESC" ? "ASC" : "DESC";
                                $(this).attr("sort", sort);
                            } else {
                                $("th[data-prop]").removeAttr("sort");
                                $(this).attr("sort", "DESC");
                            }
                            var conditions = {};
                            $("input[data-filter]").each(function (index, el) {
                                if ($(el).val()) {
                                    conditions[$(el).attr("data-filter")] = $(el).val();
                                }
                            })
                            showModelTable(model, {
                                model: model,
                                rows: $(".count_on_page").val(),
                                page: $(".cur_page").val(),
                                sort: $(this).attr("data-prop") + " " + $(this).attr("sort"),
                                conditions: JSON.stringify(conditions)
                            })
                        }
                    });
                    fields.push(prop);
                    if (attributes[prop].model) model_fields.push(prop)
                }
            }
            var query_obj = {};
            if (query) {
                query_obj = query;
                if (model_fields.length) query_obj.populate = model_fields.toString()
            }
            $.ajax({
                url: "/attributes/list",
                data: query_obj,
                success: function (response) {
                    var data = response.data;
                    for (var i = 0; i < data.length; i++) {
                        var table_row = '<tr id="' + model + '_' + data[i].id + '" data-id="' + data[i].id + '" data-model="' + model + '">';
                        for (var j = 0; j < fields.length; j++) {
                            let isPersonBirthdayField = fields[j] == "birthday" && model == "persons";
                            var to_cell = "";
                            if (data[i][fields[j]]) {
                                if (fields[j] == "password") {
                                    to_cell = "********";
                                } else if (datetimes.includes(fields[j])) {
                                    to_cell = moment(data[i][fields[j]]).format('DD.MM.YYYY HH:mm');
                                } else if (dates.includes(fields[j])) {
                                    to_cell = moment(data[i][fields[j]]).format('DD.MM.YYYY');
                                } else if (fields[j] == "schedule") {
                                    to_cell = data[i][fields[j]];
                                    to_cell = to_cell.replace("1 ", "пн ")
                                    to_cell = to_cell.replace("2 ", "вт ")
                                    to_cell = to_cell.replace("3 ", "ср ")
                                    to_cell = to_cell.replace("4 ", "чт ")
                                    to_cell = to_cell.replace("5 ", "пт ")
                                    to_cell = to_cell.replace("6 ", "сб ")
                                    to_cell = to_cell.replace("7 ", "вс ")
                                } else if (attributes[fields[j]].collection) {
                                    to_cell = data[i][fields[j]].length;
                                } else if (attributes[fields[j]].type == "boolean") {
                                    to_cell = data[i][fields[j]] ? '<i class="fa fa-check"><span class="d-none">есть</span></i>' : '<span class="d-none">нет</span>';
                                } else if (attributes[fields[j]].model) {
                                    var toViewField = "id";
                                    if (data[i][fields[j]].toView) {
                                        toViewField = "toView"
                                    } else if (data[i][fields[j]].name) {
                                        toViewField = "name"
                                    } else if (data[i][fields[j]].label) {
                                        toViewField = "label"
                                    } else {
                                        toViewField = "id"
                                    }
                                    to_cell += data[i][fields[j]][toViewField];
                                } else {
                                    to_cell = data[i][fields[j]];
                                }
                            }
                            if (model=="groups" && fields[j] == "type" && to_cell == "сборы") to_cell = window.settings_words.course;
                            table_row += '<td data-prop="' + fields[j] + '">' + to_cell + '</td>';
                            if (isPersonBirthdayField) {
                                let age = "";
                                let age_group = "";
                                if (to_cell) {
                                    age = birthDateToAge(data[i][fields[j]]);
                                    let nextYearDate = new Date(data[i][fields[j]])
                                    nextYearDate.setFullYear(nextYearDate.getFullYear() - 1);
                                    age_group = getGroupAge(data[i][fields[j]]) + " / " +getGroupAge(nextYearDate.getTime());
                                }
                                table_row += '<td class="text-center">'+age+'</td>';
                                table_row += '<td class="text-center">'+age_group+'</td>';
                            }
                        }
                        table_row += '</tr>';
                        $("#table_body").append(table_row);
                        setElementEvent($("#" + model + '_' + data[i].id), "click", function () {
                            $(this).toggleClass("selected");
                            let checked = !($("tr[data-model]:not(.selected)").length);
                            $(".select_all_btn").prop("checked", checked);
                        });
                        setElementEvent($("#" + model + '_' + data[i].id), "dblclick", function () {
                            showEditModel($(this).attr("data-id"));
                        })
                    }
                    if (query.sort) {
                        $('th[data-prop="' + ((query.sort).split(" "))[0] + '"]').attr("sort", ((query.sort).split(" "))[1]);
                    }
                    if (query.rows) {
                        $(".count_on_page").val(query.rows)
                    }
                    if (query.conditions) {
                        var conditions = JSON.parse(query.conditions);
                        for (var field in conditions) {
                            $("input[data-filter=" + field + "]").val(conditions[field])
                        }
                    }
                    if (query.page) {
                        $(".cur_page").val(query.page)
                    }
                    if (response.total_pages.toString()) {
                        $(".total_pages").text(response.total_pages)
                    }
                    if (response.total.toString()) {
                        $(".total_rows").text(response.total)
                    }
                },
                error: function (err) {
                    handleError(err)
                }
            })
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function showTables() {
    clearAll();
    $("#tables_page").show();
    $.ajax({
        url: "/attributes/models",
        success: function (data) {
            $("#tables_list").empty();
            $("#tables_body").empty();
            if (window.location.host == "demo.electrotik.ru") {
                data.splice(data.splice(data.indexOf("users")), 1);
            }
            for (var i = 0; i < data.length; i++) {
                if (!data[i].includes("_")) {
                    var label = toRU(data[i])
                    if (data[i] == "trains") label = window.settings_words.trains
                    $("#tables_list").append('<a id="table_' + data[i] + '" class="dropdown-item" data-model="' + data[i] + '">' + label + '</a>')
                    setElementEvent($("#table_" + data[i]), "click", function () {
                        showModelTable($(this).attr("data-model"), {
                            model: $(this).attr("data-model"),
                            rows: 10,
                            page: 1,
                            sort: "updatedAt DESC"
                        })
                    });
                }
            }
            if (window.profile.role == "тренер") $("#table_payments, #table_users").hide()
            $("#plans_menu_item").click();
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function getGroupAge(birthDateTime){
    let birthDate = new Date(birthDateTime);
    let birthYear = birthDate.getFullYear()
    let curYear = new Date().getFullYear();
    let age = curYear - birthYear;
    if (age <= 7) {
        return "Дети-Н"
    } else if (age >=8 && age <= 9) {
        return "Дети-1"
    } else if (age >=10 && age <= 11) {
        return "Дети-2"
    } else if (age >=12 && age <= 13) {
        return "Юниоры-1"
    } else if (age >=14 && age <= 15) {
        return "Юниоры-2"
    } else if (age >=16 && age <= 18) {
        return "Молодежь"
    } else {
        return "Взрослые"
    }
}

function addModel(from_model, from_values) {
    var model = from_model || $("#data_table").attr("data-model");
    $("#modal_body").empty();
    $("#modal_body").removeAttr("data-id")
    $.ajax({
        url: "/attributes/get?model=" + model,
        async: false,
        success: function (data) {
            var modal_body = '<form>'
            for (var prop in data) {
                if (prop != "id" && prop != "createdAt" && prop != "updatedAt" && prop != "updater" && prop != "toView") {
                    modal_body += '<div class="form-group row">';
                    var label = toRU(prop);
                    if (prop == 'trener') label = window.settings_words.trener
                    if (prop == 'trains') label = window.settings_words.trains
                    modal_body += '<label for="prop_' + prop + '" class="col-sm-2 col-form-label col-form-label-sm">' + label
                    if (data[prop].required) modal_body += '*';
                    modal_body += '</label><div class="col-sm-10">'
                    var valueToInsert = "";
                    if (data[prop].defaultsTo) valueToInsert = data[prop].defaultsTo;
                    if (from_values && from_values[prop]) valueToInsert = from_values[prop]
                    if (data[prop].validations && data[prop].validations.isIn) {
                        modal_body += '<select id="prop_' + prop + '" name="' + prop + '" required="' + data[prop].required + '" class="form-control form-control-sm">'
                        for (var i = 0; i < data[prop].validations.isIn.length; i++) {
                            if (model == "groups" && prop == "type" && data[prop].validations.isIn[i] == "сборы"){
                                if (valueToInsert == data[prop].validations.isIn[i]) {
                                    modal_body += '<option selected="selected" value="сборы">' + window.settings_words.course + '</option>'
                                } else {
                                    modal_body += '<option value="сборы">' + window.settings_words.course + '</option>'
                                }
                            } else {
                                if (valueToInsert == data[prop].validations.isIn[i]) {
                                    modal_body += '<option selected="selected">' + data[prop].validations.isIn[i] + '</option>'
                                } else {
                                    modal_body += '<option>' + data[prop].validations.isIn[i] + '</option>'
                                }
                            }
                        }
                        modal_body += '</select>'
                    } else {
                        if (data[prop].type) {
                            if (data[prop].type == "number") {
                                if (datetimes.includes(prop)) {
                                    if (valueToInsert) valueToInsert = moment(Number(valueToInsert)).format('DD.MM.YYYY HH:mm');
                                    modal_body +=
                                        '<div class="input-group date" id="datetimepicker_' + prop + '" data-target-input="nearest">\
                                        <input id="prop_'+ prop + '" type="text" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control datetimepicker-input" data-target="#datetimepicker_' + prop + '"/>\
                                        <div class="input-group-append" data-target="#datetimepicker_'+ prop + '" data-toggle="datetimepicker">\
                                            <div class="input-group-text"><i class="fa fa-calendar"></i></div>\
                                        </div>\
                                    </div>'
                                } else if (dates.includes(prop)) {
                                    if (valueToInsert) valueToInsert = moment(Number(valueToInsert)).format('DD.MM.YYYY');
                                    modal_body +=
                                        '<div class="input-group date" id="datetimepicker_' + prop + '" data-target-input="nearest">\
                                        <input id="prop_'+ prop + '" type="text" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control datetimepicker-input" data-target="#datetimepicker_' + prop + '"/>\
                                        <div class="input-group-append" data-target="#datetimepicker_'+ prop + '" data-toggle="datetimepicker">\
                                            <div class="input-group-text"><i class="fa fa-calendar"></i></div>\
                                        </div>\
                                    </div>'
                                } else {
                                    modal_body += '<input id="prop_' + prop + '" type="number" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control form-control-sm">'
                                }
                            } else if (data[prop].type == "boolean") {
                                var checked_text = valueToInsert ? "checked" : "";
                                modal_body += '<input id="prop_' + prop + '" type="checkbox" name="' + prop + '" required="' + data[prop].required + '" "' + checked_text + '" class="form-control form-control-sm">'
                            } else {
                                if (prop == "password") {
                                    modal_body += '<input id="prop_' + prop + '" type="password" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control form-control-sm">'
                                } else {
                                    if (times.includes(prop)) {
                                        modal_body +=
                                            '<div class="input-group date" id="datetimepicker_' + prop + '" data-target-input="nearest">\
                                            <input id="prop_'+ prop + '" type="text" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control datetimepicker-input" data-target="#datetimepicker_' + prop + '"/>\
                                            <div class="input-group-append" data-target="#datetimepicker_'+ prop + '" data-toggle="datetimepicker">\
                                                <div class="input-group-text"><i class="fa fa-clock-o"></i></div>\
                                            </div>\
                                        </div>'
                                    } else if (prop == "schedule") { 
                                        modal_body += '<input id="prop_schedule" name="schedule" class="form-control d-none">'
                                        for (let i = 1; i <= 7; i++){
                                            let label;
                                            if (i == 1) label = 'пн';
                                            if (i == 2) label = 'вт'
                                            if (i == 3) label = 'ср'
                                            if (i == 4) label = 'чт'
                                            if (i == 5) label = 'пт'
                                            if (i == 6) label = 'сб'
                                            if (i == 7) label = 'вс'
                                            modal_body += `<div class="input-group input-group-sm date">\
                                                <div class="input-group-prepend">\
                                                    <span class="input-group-text">${label}</span>\
                                                    <div class="input-group-text"><input id="schedule_day_${i}" type="checkbox" onchange="scheduleDayChecked(this)"></div>\
                                                    <div class="input-group-text" data-target="#datetimepicker_schedule_${i}"><i class="fa fa-clock-o"></i></div>\
                                                </div>\
                                                <input id="datetimepicker_schedule_${i}" type="text" class="form-control datetimepicker-input"  data-target-input="nearest" disabled>\
                                            </div>`;
                                        }
                                    } else {
                                        modal_body += '<input id="prop_' + prop + '" type="text" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control form-control-sm">'
                                    }
                                }
                            }
                        } else {
                            if (data[prop].collection) {
                                if (!Array.isArray(valueToInsert)) valueToInsert = [valueToInsert]
                                modal_body += '<select id="prop_' + prop + '" name="' + prop + '"  type="collection" required="' + data[prop].required + '" multiple="multiple" class="form-control form-control-sm">'
                                var toViewField = "id";
                                $.ajax({
                                    url: "/attributes/get?model=" + (data[prop].collection).toLowerCase(),
                                    async: false,
                                    success: function (attributes) {
                                        if (attributes.toView) {
                                            toViewField = "toView"
                                        } else if (attributes.name) {
                                            toViewField = "name"
                                        } else if (attributes.label) {
                                            toViewField = "label"
                                        } else {
                                            toViewField = "id"
                                        }
                                    },
                                    error: function (err) {
                                        handleError(err)
                                    }
                                })
                                $.ajax({
                                    url: "/attributes/names?model=" + (data[prop].collection).toLowerCase(),
                                    async: false,
                                    success: function (collection) {
                                        collection = collection.sort(compareByToView);
                                        last_collection = collection

                                        for (var i = 0; i < collection.length; i++) {
                                            if (Array.isArray(valueToInsert) && valueToInsert.includes(collection[i].id)) {
                                                modal_body += '<option selected="selected" value="' + collection[i].id + '">' + collection[i][toViewField] + '</option>'
                                            } else {
                                                modal_body += '<option value="' + collection[i].id + '">' + collection[i][toViewField] + '</option>'
                                            }
                                        }
                                    },
                                    error: function (err) {
                                        handleError(err)
                                    }
                                })
                                modal_body += '</select>'
                            } else if (data[prop].model) {
                                modal_body += '<select id="prop_' + prop + '" name="' + prop + '" type="models" required="' + data[prop].required + '" class="form-control form-control-sm">'
                                var toViewField = "id";
                                $.ajax({
                                    url: "/attributes/get?model=" + (data[prop].model).toLowerCase(),
                                    async: false,
                                    success: function (attributes) {
                                        if (attributes.toView) {
                                            toViewField = "toView"
                                        } else if (attributes.name) {
                                            toViewField = "name"
                                        } else if (attributes.label) {
                                            toViewField = "label"
                                        } else {
                                            toViewField = "id"
                                        }
                                    },
                                    error: function (err) {
                                        handleError(err)
                                    }
                                })
                                $.ajax({
                                    url: "/attributes/names?model=" + (data[prop].model).toLowerCase(),
                                    async: false,
                                    success: function (models) {
                                        models = models.sort(compareByToView);
                                        last_models = models
                                        if (prop == 'partner') modal_body += '<option value="">Ничего не выбрано</option>'
                                        for (var i = 0; i < models.length; i++) {
                                            for (var i = 0; i < models.length; i++) {
                                                if (valueToInsert == models[i].id) {
                                                    modal_body += '<option selected="selected" value="' + models[i].id + '">' + models[i][toViewField] + '</option>'
                                                } else {
                                                    modal_body += '<option value="' + models[i].id + '">' + models[i][toViewField] + '</option>'
                                                }
                                            }
                                        }
                                    },
                                    error: function (err) {
                                        handleError(err)
                                    }
                                })
                                modal_body += '</select>'
                            } else {
                                modal_body += '<input id="prop_' + prop + '" type="text" name="' + prop + '" required="' + data[prop].required + '" value="' + valueToInsert + '" class="form-control form-control-sm">'
                            }
                        }
                    }
                    modal_body += '</div></div>'
                }
            }
            modal_body += '</form>';
            $("#modal_title").text(toRU(model) + ": добавление")
            $("#modal_body").append(modal_body);
            if ((model == "trains" || model == "payments") && $("select[name='group']").length && !$("select[name='group']").val()) {
                alert("Необходимо, чтобы была создана хотябы одна группа")
                return;
            }
            $("#modal_dialog").modal();
            $("select[type=collection],select[type=models]").multiselect({ buttonWidth: '100%', maxHeight: 200, buttonClass: 'btn btn-sm btn-flat', enableFiltering: true, buttonText: selectButtonText });
            for (var i = 0; i < datetimes.length; i++) {
                $('#datetimepicker_' + datetimes[i]).datetimepicker({
                    locale: 'ru'
                })
            }
            for (var i = 0; i < dates.length; i++) {
                $('#datetimepicker_' + dates[i]).datetimepicker({
                    locale: 'ru',
                    format: 'DD.MM.YYYY'
                })
            }
            for (var i = 0; i < times.length; i++) {
                $('#datetimepicker_' + times[i]).datetimepicker({
                    locale: 'ru',
                    format: 'LT'
                })
            }
            if (!$("#modal_body").attr("data-id")) correctForm(model, from_values);
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function correctForm(model, from_values){
    if (model == "trains") {
        autoCompleteDatesAndSum($("select[name='group']").val(), model)
        $("select[name='group']").unbind("change");
        $("select[name='group']").on("change", function () {
            autoCompleteDatesAndSum($(this).val(), model)
        })
        $("#datetimepicker_datetime").data("datetimepicker")._notifyEvent = function (e) {
            if (e.type == "change.datetimepicker") {
                correctDates($("select[name='group']").val(), this.input[0], null)
            }
        }
    }
    if (model == "groups") {
        autoHideSchedule($("select[name='type']").val())
        $("select[name='type']").unbind("change");
        $("select[name='type']").on("change", function () {
            autoHideSchedule($(this).val())
        })
    }
    if (model == "payments") {
        autoCompleteDatesAndSum($("select[name='group']").val(), model)
        autoHideTypes($("select[name='group']").val())
        $("select[name='group']").unbind("change");
        $("select[name='group']").on("change", function () {
            autoCompleteDatesAndSum($(this).val(), model)
            autoHideTypes($(this).val())
            autoHideCount($("select[name='type']").val())
        })
        $("#datetimepicker_starts").data("datetimepicker")._notifyEvent = function (e) {
            if (e.type == "change.datetimepicker") {
                var type = $("select[name='type']").val() 
                correctDates($("select[name='group']").val(), this.input[0], type)
            }
        }
        autoHideCount($("select[name='type']").val())
        $("select[name='type']").unbind("change");
        $("select[name='type']").on("change", function () {
            autoHideCount($(this).val())
            correctSum($(this).val())
            correctDates($("select[name='group']").val(), document.getElementById("prop_starts"), $(this).val())
        })
        if (from_values && from_values.starts) $("input[name='starts']").val(moment(Number(from_values.starts)).format('DD.MM.YYYY HH:mm'))
        if (from_values && from_values.ends) $("input[name='ends']").val(moment(Number(from_values.ends)).format('DD.MM.YYYY HH:mm'))
    }
}

function getSchedule(schedule_str){
    let week_day_times = schedule_str.split(",");
    let schedule = {};
    week_day_times.forEach(week_day_time => {
        let week_day = week_day_time.split(" ")[0];
        let day_time = week_day_time.split(" ")[1];
        schedule[week_day] = day_time;
    })
    return schedule
}

function scheduleDayChecked(checkbox){
    let time_button = $(checkbox).parent().next();
    let time_input = $(checkbox).parent().parent().next();
    time_button.removeAttr("data-toggle");
    time_input.removeAttr("disabled");
    let checked = $(checkbox).prop("checked");
    if (checked) {
        time_button.attr("data-toggle","datetimepicker")
    } else {
        time_input.val("");
        time_input.attr('disabled', 'disabled');
    }
}

function showEditModel(id, from_model) {
    if (from_model) {
        addModel(from_model, {});
    } else {
        addModel();
    }
    $("#modal_body").attr("data-id", id);
    var model = from_model || $("#data_table").attr("data-model");
    $.ajax({
        url: "/" + model + "/" + id,
        async: false,
        success: function (data) {
            $(".form-control[name]").each(function (index, el) {
                var name = $(el).attr("name");
                if ($(el).attr("type") == "checkbox" && data[name]) {
                    $(el).prop("checked", true);
                }
                if (Array.isArray(data[name])) {
                    for (var i = 0; i < data[name].length; i++) {
                        $(el).find("option[value=" + data[name][i].id + "]").prop("selected", true);
                    }
                } else if (data[name] != null && typeof data[name] == 'object') {
                    $(el).find("option[value=" + data[name].id + "]").prop("selected", true);
                } else {
                    if (data[name]) {
                        if (name == "password") {
                            $(el).val(atob(data[name]))
                        } else if (name == "schedule") {
                            let schedule = getSchedule(data[name]);
                            for (let prop in schedule){
                                $(`#schedule_day_${prop}`).attr("checked", true).change();
                                $(`#datetimepicker_schedule_${prop}`).val(schedule[prop]);
                            }
                        } else {
                            if (datetimes.includes(name)) {
                                $(el).val(moment(data[name]).format('DD.MM.YYYY HH:mm'));
                            } else if (dates.includes(name)) {
                                $(el).val(moment(data[name]).format('DD.MM.YYYY'));
                            } else {
                                $(el).val(data[name]);
                            }
                        }
                    }
                }
                $("select[type=collection],select[type=models]").multiselect('refresh')
                $("#modal_title").text(toRU(model) + ": редактирование")
            })
            correctForm(model, data)
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function removeModels() {
    var model = $("#data_table").attr("data-model");
    var ids = [];
    $("tr.selected[data-model=" + model + "]").each(function (index, el) {
        ids.push($(el).attr("data-id"))
    })
    if (ids.length) {
        if (confirm("Вы уверены что хотите удалить " + ids.length + " элементов?")) {
            for (var i = 0; i < ids.length; i++) {
                $.ajax({
                    url: "/" + model + "/" + ids[i],
                    type: "DELETE",
                    async: false,
                    error: function (err) { handleError(err) }
                })
            }
            $("#table_" + model).click();
        }
    } else {
        alert("Не выбран ни один элемент")
    }
}

function saveModel(from_model, cb) {
    if (typeof from_model == "object") from_model = undefined
    var model_name = from_model || $("#data_table").attr("data-model");
    var edit = false;
    if ($("#modal_body").attr("data-id")) edit = true;
    if (!edit) {
        var to_post = {};
        var to_put = {};
        $(".form-control[name]").each(function (index, el) {
            var attr_name = $(el).attr("name");
            if ($(el).attr("type") == "checkbox") {
                to_post[attr_name] = $(el).prop("checked");
                return;
            }
            if (attr_name == "schedule") {
                let schedule_arr = [];
                for (let i = 1; i <= 7; i++){
                    let checked = $(`#schedule_day_${i}`).prop('checked');
                    let time = $(`#datetimepicker_schedule_${i}`).val();
                    if (checked && time) schedule_arr.push(`${i} ${time}`)
                }
                to_post[attr_name] = schedule_arr.join(',');
                return;
            }
            if ($(el).val()) {
                if (Array.isArray($(el).val())) {
                    to_put[attr_name] = $(el).val();
                } else {
                    if (datetimes.includes(attr_name)) {
                        to_post[attr_name] = moment($(el).val(), 'DD.MM.YYYY HH:mm').valueOf();
                    } else if (dates.includes(attr_name)) {
                        to_post[attr_name] = moment($(el).val(), 'DD.MM.YYYY').valueOf();                     
                    } else if ($(el).attr("type") == "checkbox") {
                        to_post[attr_name] = $(el).prop("checked");
                    } else {
                        to_post[attr_name] = $(el).val();
                    }
                }
            }
        })
        to_post.updater = window.profile.id;
        $.ajax({
            url: "/" + model_name,
            type: "POST",
            data: to_post,
            success: function (data) {
                for (var prop in to_put) {
                    for (var i = 0; i < to_put[prop].length; i++) {
                        $.ajax({
                            url: "/" + model_name + "/" + data.id + "/" + prop + "/" + to_put[prop][i],
                            type: "PUT",
                            async: false,
                            error: function (err) { handleError(err) }
                        })
                        if (model_name == "trains" && prop == "members" && data.group && data.group.id) {
                            $.ajax({
                                url: "/groups/" + data.group.id + "/" + prop + "/" + to_put[prop][i],
                                type: "PUT",
                                async: false,
                                error: function (err) { handleError(err) }
                            })
                        }
                    }
                }
                $("#modal_dialog").modal('hide');
                if (!from_model) $("#table_" + model_name).click();
                if (cb) cb()
            },
            error: function (err) {
                handleError(err)
            }
        })
    } else {
        var id = $("#modal_body").attr("data-id");
        $.ajax({
            url: "/" + model_name + "/" + id,
            success: function (base_model) {
                for (var prop in base_model) {
                    if (Array.isArray(base_model[prop])) {
                        for (var i = 0; i < base_model[prop].length; i++) {
                            base_model[prop][i] = base_model[prop][i].id
                        }
                    } else {
                        if (base_model[prop] != null && typeof base_model[prop] == 'object') {
                            base_model[prop] = base_model[prop].id
                        }
                    }
                }
                var update_obj = {};
                var assocs_add = {}
                var assocs_remove = {}
                $(".form-control[name]").each(function (index, el) {
                    var name = $(el).attr("name");
                    if ($(el).attr("type") == "checkbox") {
                        update_obj[name] = $(el).prop("checked");
                        return;
                    }
                    if (name == "schedule") {
                        let schedule_arr = [];
                        for (let i = 1; i <= 7; i++){
                            let checked = $(`#schedule_day_${i}`).prop('checked');
                            let time = $(`#datetimepicker_schedule_${i}`).val();
                            if (checked && time) schedule_arr.push(`${i} ${time}`)
                        }
                        update_obj[name] = schedule_arr.join(',');
                        return;
                    }
                    if (Array.isArray(base_model[name])) {
                        var val_arr = $(el).val() || [];
                        assocs_add[name] = [];
                        assocs_remove[name] = [];
                        for (var i = 0; i < val_arr.length; i++) {
                            if (!base_model[name].includes(val_arr[i])) {
                                assocs_add[name].push(val_arr[i])
                            }
                        }
                        for (var i = 0; i < base_model[name].length; i++) {
                            if (!val_arr.includes(base_model[name][i])) {
                                assocs_remove[name].push(base_model[name][i])
                            }
                        }
                        if (!assocs_add[name].length) delete assocs_add[name];
                        if (!assocs_remove[name].length) delete assocs_remove[name];
                    } else {
                        if (datetimes.includes(name)) {
                            update_obj[name] = moment($(el).val(), 'DD.MM.YYYY HH:mm').valueOf();
                        } else if (dates.includes(name)) {
                           update_obj[name] = moment($(el).val(), 'DD.MM.YYYY').valueOf();
                        } else {
                            if($(el).attr("type") == "number"){
                                update_obj[name] = Number($(el).val());
                            }else {                                     
                                update_obj[name] = $(el).val();
                            }
                        }
                    }
                })
                update_obj.updater = window.profile.id;
                $.ajax({
                    url: "/" + model_name + "/" + id,
                    type: "PATCH",
                    data: update_obj,
                    success: function (data) {
                        for (var prop in assocs_add) {
                            for (var i = 0; i < assocs_add[prop].length; i++) {
                                $.ajax({
                                    url: "/" + model_name + "/" + id + "/" + prop + "/" + assocs_add[prop][i],
                                    type: "PUT",
                                    async: false,
                                    error: function (err) { handleError(err) }
                                })
                                if (model_name == "trains" && prop == "members" && data.group && data.group.id) {
                                    $.ajax({
                                        url: "/groups/" + data.group.id + "/" + prop + "/" + assocs_add[prop][i],
                                        type: "PUT",
                                        async: false,
                                        error: function (err) { handleError(err) }
                                    })
                                }
                            }
                        }
                        for (var prop in assocs_remove) {
                            for (var i = 0; i < assocs_remove[prop].length; i++) {
                                $.ajax({
                                    url: "/" + model_name + "/" + id + "/" + prop + "/" + assocs_remove[prop][i],
                                    type: "DELETE",
                                    async: false,
                                    error: function (err) { handleError(err) }
                                })
                            }
                        }
                        $("#modal_dialog").modal('hide');
                        if (!from_model) $("#table_" + model_name).click();
                        if (cb) cb()
                    },
                    error: function (err) {
                        handleError(err)
                    }
                })
            },
            error: function (err) {
                handleError(err)
            }
        })
    }
}

function clearAll() {
    $(".page").hide();
    clearBlocks();
    $("#login").val("");
    $("#password").val("");
    if (window.profile && window.profile.role == "тренер") {
        $("#stats_members_menu_item, #stats_treners_menu_item, #stats_payments_menu_item, #pays_menu_item").hide()
    } else {
        $("#stats_members_menu_item, #stats_treners_menu_item, #stats_payments_menu_item, #pays_menu_item").show()
    }
}

function addZeros(n, needLength) {
    needLength = needLength || 2;
    n = String(n);
    while (n.length < needLength) {
        n = "0" + n;
    }
    return n
}

function setElementEvent(el, type, handler){
    el.unbind(type);
    el.on(type, handler);
}

function clearBlocks() {
    $(".modal-save-btn").hide();
    $("#modal_save_btn").show();
    if ($('.navbar-toggler').is(":visible") && $('#navbarNav').hasClass("show")) {
        $('.navbar-toggler').click();
    }
    $(".block").hide();
}

function showAuth() {
    clearAll();
    $("#auth_page").show()
}

function sendAuth() {
    if ($("#login").val() && $("#password").val()) {
        $.ajax({
            url: "/auth/login",
            data: {
                login: $("#login").val(),
                password: $("#password").val()
            },
            success: function (data) {
                window.profile = data;
                getWords(showTables)
            },
            error: function (err) {
                handleError(err)
            }
        })
    } else {
        alert("Поля логин и пароль должны быть заполнены");
    }
}

function logout() {
    delete window.profile;
    $.ajax({
        url: "/auth/logout",
        success: function () {
            showAuth()
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function selectButtonText(options) {
    if (options.length === 0) {
        return 'Ничего не выбрано';
    } else if (options.length > 3) {
        return 'Выбрано ' + options.length;
    } else {
        var labels = [];
        options.each(function () {
            let label = $(this).attr('label') !== undefined ? $(this).attr('label') : $(this).html();
            labels.push(label);
        });
        return labels.join(', ') + '';
    }
}

function correctSum(type){
    var cur_group;
    for (var i = 0; i < last_models.length; i++){
        var selected = $("select[name='group']").val()
        if (last_models[i].id == selected){
            cur_group = last_models[i]
        }
    }
    if (!cur_group) return;
    if (type == "разовый"){
        $("input[name='sum']").val(cur_group.once_sum)
    } else {
        $("input[name='sum']").val(cur_group.sum)
    }
}

function autoHideCount(type){
    if (type != "абонемент"){
        $("label[for='prop_count']").parent().hide();
    } else {
        $("label[for='prop_count']").parent().show();
    }
}

function autoHideTypes(id) {
    for (var i = 0; i < last_models.length; i++){
        if (last_models[i].id == id){
            if (last_models[i].type == "групповая") {
                $("label[for='prop_type']").parent().show();
                $("#prop_type option:nth-child(2)").show();
            } else if (last_models[i].type == "индивидуальная"){
                $("label[for='prop_type']").parent().show();
                $("#prop_type option:nth-child(2)").hide();
            } else {
                $("label[for='prop_type']").parent().hide();
            }
        }
    }
}

function autoHideSchedule(value) {
    switch (value) {
        case "групповая":
            $("label[for='prop_time'],label[for='prop_schedule'],label[for='prop_once_sum'],label[for='prop_hall'],label[for='prop_duration'],label[for='prop_trener'],label[for='prop_trains']").parent().show();
            break;
        case "индивидуальная":
            $("label[for='prop_once_sum']").parent().hide();
            $("label[for='prop_time'],label[for='prop_schedule'],label[for='prop_hall'],label[for='prop_duration'],label[for='prop_trener'],label[for='prop_trains']").parent().show();
            break;
        case "сборы":
            $("label[for='prop_once_sum'],label[for='prop_schedule']").parent().hide();
            $("label[for='prop_time'],label[for='prop_hall'],label[for='prop_duration'],label[for='prop_trener'],label[for='prop_trains']").parent().show();
            break;
        case "сбор денег":
            $("label[for='prop_time'],label[for='prop_schedule'],label[for='prop_once_sum'],label[for='prop_hall'],label[for='prop_duration'],label[for='prop_trener'],label[for='prop_trains']").parent().hide();
            break;
        default:
            break;
    }
}

function setDateInputValue(value, cur_group, el, type){
    var moment_date = moment(value, 'DD.MM.YYYY HH:mm');
    var add_duration_date = new Date(moment_date.valueOf())
    var group_duration = cur_group.duration || 60;
    if (type) {
        if (type == "разовый"){
            add_duration_date.setMinutes(add_duration_date.getMinutes() + group_duration);
        } else {
            if (cur_group.type != "групповая") {
                add_duration_date.setMinutes(add_duration_date.getMinutes() + group_duration);
            } else {
                add_duration_date.setMonth(add_duration_date.getMonth() + 1);
            }    
        }
    } else {
        add_duration_date.setMinutes(add_duration_date.getMinutes() + group_duration);
    }
    
    var input = $("input[name='ends']");
    if (el) input = el;
    input.val(moment(add_duration_date).format('DD.MM.YYYY HH:mm'))
}

function correctDates(id, el, type) {
    var cur_group = {};
    $.ajax({
        url: "/groups/" + id,
        async: false,
        data: {
            populate: "updater"
        },
        success: function (group) {
            cur_group = group;
        },
        error: function (err) {
            handleError(err)
        }
    })
    try {
        if (type) {
            // payments
            setDateInputValue($(el).val(), cur_group, null, type);
        } else {
            // trains
            setDateInputValue($(el).val(), cur_group, $("input[name='datetime_end']"), null);
        }
    } catch (error) {
        console.log(error)
    }
}

function getGroupTime(schedule_str) {
    if (!schedule_str) return '17:00';
    var date = new Date();
    var day = (date).getDay();
    if (!day) day = 7;
    day = day.toString();
    var schedule = getSchedule(schedule_str);
    if (schedule[day]) return schedule[day];
    return '17:00';
}

function setAutoCompleteInputDates(cur_date, cur_group){
    var moment_date;
    if (cur_group && cur_group.schedule) {
        var group_time = getGroupTime(cur_group.schedule)
        moment_date = moment(addZeros(cur_date.getDate()) + "." + addZeros(Number(cur_date.getMonth()) + 1) + "." + cur_date.getFullYear() + " " + group_time, 'DD.MM.YYYY HH:mm')
    } else {
        moment_date = moment("01." + addZeros(Number(cur_date.getMonth()) + 1) + "." + cur_date.getFullYear() + " 00:00", 'DD.MM.YYYY HH:mm');
    }
    var add_duration_date = new Date(moment_date.valueOf())
    if (cur_group && cur_group.duration) {
        add_duration_date.setMinutes(add_duration_date.getMinutes() + cur_group.duration);
    } else {
        add_duration_date.setMonth(add_duration_date.getMonth() + 1);
    }
    var add_duration_moment = moment(add_duration_date);
    $("input[name='starts']").val(moment_date.format('DD.MM.YYYY HH:mm'))
    $("input[name='ends']").val(add_duration_moment.format('DD.MM.YYYY HH:mm'))
}

function autoCompleteDatesAndSum(id, model) {
    var cur_group = {};
    $.ajax({
        url: "/groups/" + id,
        async: false,
        data: {
            populate: "members"
        },
        success: function (group) {
            cur_group = group;
        },
        error: function (err) {
            handleError(err)
        }
    })
    try {
        var cur_date = new Date();
        if (model == "trains") {
            if (cur_group.duration && cur_group.schedule) {
                if (!$("input[name='datetime']").val() && !$("input[name='datetime_end']").val()) {
                    setAutoCompleteInputDates(cur_date, cur_group);
                }
            }
            if (cur_group.hall) $("[name=hall]").val(cur_group.hall)
            if (cur_group.trener) $("[name=trener]").multiselect('select', cur_group.trener)
            if (cur_group.trener) $("[name=trener]").multiselect('refresh')
        } else if (model == "payments") {
            if (cur_group.type == "индивидуальная") {
                if ($("#modal_body").attr("data-id")) {
                    if (cur_group.duration && cur_group.schedule) {
                        if (!$("input[name='starts']").val() && !$("input[name='ends']").val()) {
                            setAutoCompleteInputDates(cur_date, cur_group);
                        }
                    }
                } else {
                    if (cur_group.duration && cur_group.schedule) {
                        setAutoCompleteInputDates(cur_date, cur_group);
                    }
                }
            } else if (cur_group.type == "групповая") {
                if ($("#modal_body").attr("data-id")) {
                    if (!$("input[name='starts']").val() && !$("input[name='ends']").val()) {
                        setAutoCompleteInputDates(cur_date);
                    }
                } else {
                    setAutoCompleteInputDates(cur_date);
                }
            }

            let cur_group_sum = cur_group.sum;
            if (cur_group.type == "индивидуальная" && cur_group.members.length) {
                cur_group_sum = cur_group_sum/cur_group.members.length;
            }
            if ($("#modal_body").attr("data-id")) {
                if (!$("input[name='sum']").val()) {
                    $("input[name='sum']").val(cur_group_sum)
                }
            } else {

                $("input[name='sum']").val(cur_group_sum)
            }
        }
    } catch (error) {
        console.log(error)
    }
}

function selectAll() {
    if ($(".select_all_btn").prop("checked")) {
        $("tr[data-id]").addClass("selected");
    } else {
        $("tr[data-id]").removeClass("selected");
    }
}

function updateLimitTable() {
    var model = $("#data_table").attr("data-model");
    var conditions = {};
    $("input[data-filter]").each(function (index, el) {
        if ($(el).val()) {
            conditions[$(el).attr("data-filter")] = $(el).val();
        }
    })
    var sort = "updatedAt DESC";
    if ($("th[sort]").length) {
        sort = $("th[sort]").attr("data-prop") + " " + $("th[sort]").attr("sort")
    }

    showModelTable(model, {
        model: model,
        rows: $(".count_on_page").val(),
        page: $(".cur_page").val(),
        sort: sort,
        conditions: JSON.stringify(conditions)
    })
}

function toLeftEnd() {
    $(".cur_page").val(1)
    updateLimitTable()
}

function toLeft() {
    if ($(".cur_page").val() > 1) {
        $(".cur_page").val(Number($(".cur_page").val()) - 1)
        updateLimitTable()
    }
}

function toRight() {
    if ($(".cur_page").val() < Number($(".total_pages").text())) {
        $(".cur_page").val(Number($(".cur_page").val()) + 1)
        updateLimitTable()
    }
}

function toRightEnd() {
    $(".cur_page").val(Number($(".total_pages").text()))
    updateLimitTable()
}

function changeFileInput() {
    if ($('#fileInput')[0]) {
        var model = $("#data_table").attr("data-model");
        var data = new FormData();
        $.each($('#fileInput')[0].files, function (i, file) {
            data.append('file' + i, file);
        })
        $('#fileInput').val("");
        $.ajax({
            url: "/" + model + "/import",
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            success: function () {
                alert("Импорт прошёл успешно!");
                showModelTable(model, {
                    model: model,
                    rows: $(".count_on_page").val(),
                    page: $(".cur_page").val()
                })
            },
            error: function (err) {
                handleError(err);
            }
        });
    }
}

function importModel() {
    $("#fileInput").click();
}

function ec(r, c){
    return XLSX.utils.encode_cell({r:r,c:c});
}
function deleteRow(ws, row_index){
    var variable = XLSX.utils.decode_range(ws["!ref"])
    for(var R = row_index; R < variable.e.r; ++R){
        for(var C = variable.s.c; C <= variable.e.c; ++C){
            ws[ec(R,C)] = ws[ec(R+1,C)];
        }
    }
    variable.e.r--
    ws['!ref'] = XLSX.utils.encode_range(variable.s, variable.e);
}

function exportModel() {
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById("data_table"), {raw: true }));
    var wopts = { bookType: 'xlsx', type: 'array' };
    deleteRow(wb.Sheets[wb.SheetNames[0]], 1);
    var wbout = XLSX.write(wb, wopts);
    var fileName = toRU($("#data_table").attr("data-model"));
    var link = document.createElement("a");
    var blob = new Blob([wbout], { type: "application/octet-stream" });
    link.href = window.URL.createObjectURL(blob);
    link.style = "visibility:hidden";
    link.download = fileName + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showJournals() {
    $("#journals_groups").empty();
    clearBlocks();
    $("#journals_block").show();
    $.ajax({
        url: "/groups",
        data: {
            where: '{"in_archive":{"!=":true}}'
        },
        success: function (groups) {
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].type != "сбор денег"){
                    var trener = ""
                    if (groups[i].trener && groups[i].trener.toView) trener = groups[i].trener.toView
                    var members_length = groups[i].members.length - groups[i].archived.length;
                    $("#journals_groups").append(
                        '<div class="col-md-3 pointed" data-label="' + groups[i].label + '" data-id="' + groups[i].id + '" id="journal_' + groups[i].id + '">\
                        <div class="card mb-3 box-shadow">\
                            <div class="card-header">\
                                <strong>'+ groups[i].label + '</strong>\
                            </div>\
                            <div class="card-body">\
                                <p class="card-text">'+window.settings_words['trener']+': '+ trener + '</p>\
                                <p class="card-text">Участиков: '+ members_length + '</p>\
                            </div>\
                        </div>\
                    </div>');
                    setElementEvent($('#journal_' + groups[i].id), "click", showTrains);
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    })
}

function showTrains() {
    var group_id = $(this).attr("data-id")
    var group_label = $(this).attr("data-label")
    showTrainsList(group_id, group_label)
}

function showLastTrainsList(){
    let group_id = $("#train_members").attr("data-group")
    $.ajax({
        url: "/groups/" + group_id,
        data: {
            populate: "updater"
        },
        success: function (group) {
            showTrainsList(group_id, group.label)
        },
        error: function (err) {
            handleError(err);
        }
    });    
}

function showTrainsList(group_id, group_label, cur_page) {
    var page = cur_page || 1;
    $("#trains_title").text(window.settings_words["trains"]+" группы " + group_label)
    $("#group_trains").empty();
    $("#group_trains").removeAttr("data-label")
    $("#group_trains").removeAttr("data-id")
    $("#group_trains").removeAttr("data-duration")
    $("#group_trains").removeAttr("data-hall")
    $("#group_trains").removeAttr("data-trener")
    $("#group_trains").removeAttr("data-datetime")
    $(".bootstrap-datetimepicker-widget.dropdown-menu.usetwentyfour.bottom").hide();
    clearBlocks();
    $("#trains_block").show();
    let totals = {}
    $.ajax({
        url: "/trains/get_total?group_id="+group_id,
        async: false,
        success: function(data){
            totals = data;
        }, 
        error: function(err){
            handleError(err);
        }
    })
    $.ajax({
        url: "/attributes/list",
        data: {
            conditions: JSON.stringify({ group: group_label }),
            sort: "datetime DESC",
            page: page,
            rows: 50,
            model: "trains"
        },
        success: function (response) {
            var trains = response.data;
            var total_pages = response.total_pages;
            for (var i = 0; i < trains.length; i++) {
                var trener = "";
                if (trains[i].trener && trains[i].trener.toView) trener = trains[i].trener.toView
                var group = ""
                if (trains[i].group && trains[i].group.id) group = trains[i].group.id;
                var trener_id = "";
                if (trains[i].trener && trains[i].trener.id) trener_id = trains[i].trener.id
                var train_members_length = totals[trains[i].id];
                $("#group_trains").append(
                    '<div class="col-md-3">\
                    <div class="card mb-3 box-shadow">\
                        <div class="card-header">\
                            <button type="button" class="close" data-id="'+ trains[i].id + '" id="remove_train_' + trains[i].id + '" aria-label="Close">\
                                <span aria-hidden="true">&times;</span>\
                            </button>\
                            <strong>'+ moment(trains[i].datetime).format('DD.MM.YYYY HH:mm') + '</strong>\
                        </div>\
                        <div class="card-body pointed"  data-group="'+ group + '" data-trener="' + trener_id + '" data-name="' + trains[i].toView + '" data-id=' + trains[i].id + ' id="train_' + trains[i].id + '">\
                            <p class="card-text">'+window.settings_words['trener']+': '+ trener + '</p>\
                            <p class="card-text">Присутствовало: '+ train_members_length + '</p>\
                        </div>\
                    </div>\
                </div>');
                setElementEvent($('#train_' + trains[i].id), "click", showTrainList);
                setElementEvent($("#remove_train_" + trains[i].id), "click", function () {
                    if (confirm("Вы уверены, что хотите удалить "+window.settings_words['for_train']+"?")) {
                        var id = $(this).attr("data-id");
                        $.ajax({
                            url: "/trains/" + id,
                            type: "DELETE",
                            success: function () {
                                showTrainsList(group_id, group_label)
                            },
                            error: function (err) {
                                handleError(err);
                            }
                        });
                    }
                });
            }
            $.ajax({
                url: "/groups/" + group_id,
                data: {
                    populate: "members"
                },
                success: function (group) {
                    var in_group = [];
                    $("#group_trains").attr("data-group", group_id)
                    if (group.id) $("#group_trains").attr("data-id", group.id)
                    if (group.label) $("#group_trains").attr("data-label", group.label)
                    if (group.duration) $("#group_trains").attr("data-duration", group.duration)
                    if (group.hall) $("#group_trains").attr("data-hall", group.hall)
                    if (group.trener) $("#group_trains").attr("data-trener", group.trener)
                    var group_time = getGroupTime(group.schedule)
                    var cur_date = new Date()
                    cur_date.setHours((group_time.split(":"))[0])
                    cur_date.setMinutes((group_time.split(":"))[1])
                    $("#group_trains").attr("data-datetime", cur_date.getTime())
                    for (var i = 0; i < group.members.length; i++) {
                        in_group.push(group.members[i].id);
                    }
                    $.ajax({
                        url: "/attributes/names?model=persons",
                        success: function (persons) {
                            for (var j = 0; j < persons.length; j++) {
                                if (!in_group.includes(persons[j].id)) {
                                    $("#group_member_append_menu").append('<a class="dropdown-item group-member-menu-item" data-id="' + persons[j].id + '" href="javascript:void(0)">' + persons[j].toView + '</a>')
                                    setElementEvent($('.group-member-menu-item[data-id="' + persons[j].id + '"]'), "click", function () {
                                        var mem_id = $(this).attr("data-id")
                                        $.ajax({
                                            url: "/groups/" + group_id + "/members/" + mem_id,
                                            type: "PUT",
                                            success: function () {
                                                showTrainsList(group_id, group_label)
                                            },
                                            error: function (err) {
                                                handleError(err);
                                            }
                                        });
                                    })
                                }
                            }
                        },
                        error: function (err) {
                            handleError(err);
                        }
                    })
                },
                error: function (err) {
                    handleError(err);
                }
            });
            setElementEvent($("#trains_left_btn"), "click", function () {
                if (page > 1) {
                    page--;
                    showTrainsList(group_id, group_label, page)
                }
            })
            setElementEvent($("#trains_right_btn"), "click", function () {
                if (page < total_pages) {
                    page++;
                    showTrainsList(group_id, group_label, page)
                }
            })
        },
        error: function (err) {
            handleError(err);
        }
    })
}

function birthDateToAge(birthDate) {
    birthDate = new Date(birthDate);

    var now = new Date(),
        age = now.getFullYear() - birthDate.getFullYear();

    return age;
}

function compareByName( a, b ) {
    if ( a.name < b.name ){
      return -1;
    }
    if ( a.name > b.name ){
      return 1;
    }
    return 0;
}
function compareByToView( a, b ) {
    if ( a.toView < b.toView ){
      return -1;
    }
    if ( a.toView > b.toView ){
      return 1;
    }
    return 0;
}

function compareByPayerToView( a, b ) {
    if ( a.payer.toView < b.payer.toView ){
      return -1;
    }
    if ( a.payer.toView > b.payer.toView ){
      return 1;
    }
    return 0;
}

function updateShowTrain(train_id, group_id, trener_id, train_name) {
    $("#train_journal_title").text(window.settings_words["train"]+": " + train_name)
    $("#train_members").empty();
    $('#train_trener_select').empty();
    $("#all_train_members_btn").prop('checked', false);
    clearBlocks();
    $("#train_journal_block").show();
    $("#train_members").attr("data-id", train_id)
    $("#train_members").attr("data-group", group_id)
    $.ajax({
        url: "/groups/" + group_id,
        data: {
            populate: "members,archived"
        },
        success: function (group) {
            var in_group = [];
            let in_archive = group.archived.map(ia => ia.id);
            group.members = group.members.filter(m => !in_archive.includes(m.id))
            group.members = group.members.sort(compareByName); 
            for (var i = 0; i < group.members.length; i++) {
                in_group.push(group.members[i].id)
                $("#train_members").append(
                    '<li class="list-group-item">\
                    <div class="form-check">\
                        <input class="form-check-input" type="checkbox" data-prop="train-member" data-id="'+ group.members[i].id + '" id="train_member_' + group.members[i].id + '">\
                        <label class="form-check-label" for="train_member_'+ group.members[i].id + '">\
                        '+ group.members[i].name + '\
                        </label>\
                    </div>\
                </li>');
                setElementEvent($('#train_member_' + group.members[i].id), "click", function () {
                    var id = $(this).attr("data-id");
                    $("#total_train_members").val("Всего: " + $('[data-prop="train-member"]:checked').length)
                    if (!($("[data-prop='train-member']:not(:checked)").length)) {
                        $("#all_train_members_btn").prop("checked", true)
                    } else {
                        $("#all_train_members_btn").prop("checked", false)
                    }
                    if ($(this).prop("checked")) {
                        $.ajax({
                            url: "/trains/" + train_id + "/members/" + id,
                            type: "PUT",
                            error: function (err) {
                                handleError(err);
                            }
                        });
                    } else {
                        $.ajax({
                            url: "/trains/" + train_id + "/members/" + id,
                            type: "DELETE",
                            error: function (err) {
                                handleError(err);
                            }
                        });
                    }
                });
            }
            $.ajax({
                url: "/attributes/names?model=persons",
                success: function (persons) {
                    for (var j = 0; j < persons.length; j++) {
                        if (!in_group.includes(persons[j])) {
                            if (persons[j].id == trener_id) {
                                $('#train_trener_select').append('<option value="' + persons[j].id + '" selected="selected">' + persons[j].toView + '</option>')
                            } else {
                                $('#train_trener_select').append('<option value="' + persons[j].id + '">' + persons[j].toView + '</option>')
                            }
                        }
                    }
                    setElementEvent($('#train_trener_select'), "change", function () {
                        $.ajax({
                            url: "/trains/" + train_id,
                            type: "PATCH",
                            data: {
                                trener: $(this).val()
                            },
                            error: function (err) {
                                handleError(err);
                            }
                        });
                    });
                },
                error: function (err) {
                    handleError(err);
                }
            })
            $.ajax({
                url: "/trains/" + train_id,
                data: {
                    populate: "members"
                },
                success: function (train) {
                    for (var k = 0; k < train.members.length; k++) {
                        $('#train_member_' + train.members[k].id).prop("checked", true)
                    }
                    $("#total_train_members").val("Всего: " + $('[data-prop="train-member"]:checked').length)
                },
                error: function (err) {
                    handleError(err);
                }
            })
            setElementEvent($("#all_train_members_btn"), "change", function () {
                if ($(this).prop("checked")) {
                    $('[data-prop="train-member"]:not(:checked)').each(function (index, el) {
                        $(el).click()
                    })
                } else {
                    $('[data-prop="train-member"]:checked').each(function (index, el) {
                        $(el).click()
                    })
                }
            })
        },
        error: function (err) {
            handleError(err);
        }
    })
}

function showTrainList() {
    var train_id = $(this).attr("data-id")
    var group_id = $(this).attr("data-group")
    var trener_id = $(this).attr("data-trener")
    var train_name = $(this).attr("data-name")
    updateShowTrain(train_id, group_id, trener_id, train_name);
}

function renderStatsMembers() {
    var month = $("#stats_members_month_select").val()
    var year = $("#stats_members_year_input").val()
    var month_date = new Date(year, month);
    var next_month_date = new Date(year, month);
    next_month_date.setMonth(next_month_date.getMonth() + 1);
    if (membersChart && membersChart.destroy) membersChart.destroy()
    var ctx = document.getElementById("stats_members_canvas");
    var pers_groups = [];
    var group_groups = [];
    var camp_groups = [];
    var labels = [];
    var counts = [];
    var personal_trains = [];
    var group_trains = [];
    var camp_trains = [];
    $.ajax({
        url: "/groups",
        data: {
            select: "type",
            populate: "updater"
        },
        async: false,
        success: function (groups) {
            for (var k = 0; k < groups.length; k++) {
                if (groups[k].type == "групповая") {
                    group_groups.push(groups[k].id);
                }
                if (groups[k].type == "индивидуальная") {
                    pers_groups.push(groups[k].id);
                }
                if (groups[k].type == "сборы") {
                    camp_groups.push(groups[k].id);
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    });

    $.ajax({
        url: "/trains",
        data: {
            select: "toView,group",
            populate: "members",
            where: JSON.stringify({ datetime: { "<": next_month_date.getTime(), ">=": month_date.getTime() } })
        },
        async: false,
        success: function (trains) {
            for (var i = 0; i < trains.length; i++) {
                trains[i].members =  trains[i].members.sort(compareByToView)
                for (var j = 0; j < trains[i].members.length; j++) {
                    if (labels.includes(trains[i].members[j].toView)) {
                        counts[labels.indexOf(trains[i].members[j].toView)]++;
                        if (group_groups.includes(trains[i].group)) group_trains[labels.indexOf(trains[i].members[j].toView)]++
                        if (pers_groups.includes(trains[i].group)) personal_trains[labels.indexOf(trains[i].members[j].toView)]++
                        if (camp_groups.includes(trains[i].group)) camp_trains[labels.indexOf(trains[i].members[j].toView)]++
                    } else {
                        labels.push(trains[i].members[j].toView)
                        counts.push(1);
                        if (group_groups.includes(trains[i].group)) group_trains.push(1)
                        else group_trains.push(0)
                        if (pers_groups.includes(trains[i].group)) personal_trains.push(1)
                        else personal_trains.push(0)
                        if (camp_groups.includes(trains[i].group)) camp_trains.push(1)
                        else camp_trains.push(0)
                    }
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    })
    labels = cutLabels(labels);
    sortArraysByCounts(counts, labels, group_trains, personal_trains, camp_trains)

    ctx.height = labels.length * 15;
    membersChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Общее количество занятий',
                data: counts,
                backgroundColor: "#ffc107",
                borderColor: "#ffc107",
                borderWidth: 1
            },
            {
                label: 'Групповых занятий',
                data: group_trains,
                backgroundColor: "#007bff",
                borderColor: "#007bff",
                borderWidth: 1
            },
            {
                label: 'Индивидуальных занятий',
                data: personal_trains,
                backgroundColor: "#dc3545",
                borderColor: "#dc3545",
                borderWidth: 1
            },
            {
                label: 'Занятий на сборах',
                data: camp_trains,
                backgroundColor: "#28a745",
                borderColor: "#28a745",
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        beginAtZero: true,
                        stepSize: 1
                    }
                }]
            }
        }
    });
}

function showStatsMembers() {
    clearBlocks();
    $("#stats_members_block").show();
    $("#stats_members_month_select").val((new Date()).getMonth())
    $("#stats_members_year_input").val((new Date()).getFullYear())
    renderStatsMembers()
}

function renderStatsTreners() {
    var month = $("#stats_treners_month_select").val()
    var year = $("#stats_treners_year_input").val()
    var month_date = new Date(year, month);
    var next_month_date = new Date(year, month);
    next_month_date.setMonth(next_month_date.getMonth() + 1);
    if (trenersChart && trenersChart.destroy) trenersChart.destroy()
    var ctx = document.getElementById("stats_treners_canvas");
    var pers_groups = [];
    var group_groups = [];
    var camp_groups = [];
    var labels = [];
    var counts = [];
    var personal_trains = [];
    var group_trains = [];
    var camp_trains = [];
    $.ajax({
        url: "/groups",
        data: {
            select: "type",
            populate: "updater"
        },
        async: false,
        success: function (groups) {
            for (var k = 0; k < groups.length; k++) {
                if (groups[k].type == "групповая") {
                    group_groups.push(groups[k].id);
                }
                if (groups[k].type == "индивидуальная") {
                    pers_groups.push(groups[k].id);
                }
                if (groups[k].type == "сборы") {
                    camp_groups.push(groups[k].id);
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    });
    $.ajax({
        url: "/trains",
        data: {
            select: "toView,group",
            populate: "trener",
            where: JSON.stringify({ datetime: { "<": next_month_date.getTime(), ">=": month_date.getTime() } })
        },
        async: false,
        success: function (trains) {
            for (var i = 0; i < trains.length; i++) {
                if (trains[i].trener) {
                    if (labels.includes(trains[i].trener.toView)) {
                        counts[labels.indexOf(trains[i].trener.toView)]++;
                        if (group_groups.includes(trains[i].group)) group_trains[labels.indexOf(trains[i].trener.toView)]++
                        if (pers_groups.includes(trains[i].group)) personal_trains[labels.indexOf(trains[i].trener.toView)]++
                        if (camp_groups.includes(trains[i].group)) camp_trains[labels.indexOf(trains[i].trener.toView)]++
                    } else {
                        labels.push(trains[i].trener.toView)
                        counts.push(1);
                        if (group_groups.includes(trains[i].group)) group_trains.push(1)
                        else group_trains.push(0)
                        if (pers_groups.includes(trains[i].group)) personal_trains.push(1)
                        else personal_trains.push(0)
                        if (camp_groups.includes(trains[i].group)) camp_trains.push(1)
                        else camp_trains.push(0)
                    }
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    })
    labels = cutLabels(labels)
    sortArraysByCounts(counts, labels, group_trains, personal_trains, camp_trains)
    ctx.height = labels.length * 25;
    trenersChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Общее количество занятий',
                data: counts,
                backgroundColor: "#ffc107",
                borderColor: "#ffc107",
                borderWidth: 1
            },
            {
                label: 'Групповых занятий',
                data: group_trains,
                backgroundColor: "#007bff",
                borderColor: "#007bff",
                borderWidth: 1
            },
            {
                label: 'Индивидуальных занятий',
                data: personal_trains,
                backgroundColor: "#dc3545",
                borderColor: "#dc3545",
                borderWidth: 1
            },
            {
                label: 'Занятий на сборах',
                data: camp_trains,
                backgroundColor: "#28a745",
                borderColor: "#28a745",
                borderWidth: 1
            }
            ]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        beginAtZero: true,
                        stepSize: 1
                    }
                }]
            }
        }
    });
}

function sortArraysByCounts(counts, labels, groups, personals, camps){
    for(let i=0; i < counts.length; i++){
        for(let j= i+1; j < counts.length; j++){
            if(counts[i] < counts[j]){
                let swap_count = counts[i];
                let swap_label = labels[i];
                labels[i] = labels[j];
                counts[i] = counts[j];
                labels[j] = swap_label;
                counts[j] = swap_count;

                if (!groups) continue;
                let swap_group = groups[i];
                let swap_personal = personals[i];
                let swap_camp = camps[i];
                
                groups[i] = groups[j];
                personals[i] = personals[j];
                camps[i] = camps[j];
                
                groups[j] = swap_group;
                personals[j] = swap_personal;
                camps[j] = swap_camp;
            }
        }
    }
}

function showStatsTreners() {
    clearBlocks();
    $("#stats_treners_block").show();
    $("#stats_treners_month_select").val((new Date()).getMonth())
    $("#stats_treners_year_input").val((new Date()).getFullYear())
    renderStatsTreners()
}

function renderStatsPayments() {
    var month = $("#stats_payments_month_select").val()
    var year = $("#stats_payments_year_input").val()
    var month_date = new Date(year, month);
    var next_month_date = new Date(year, month);
    next_month_date.setMonth(next_month_date.getMonth() + 1);

    $("#stats_payments_trains").text("");
    $("#stats_payments_visits").text("");
    $("#stats_payments_pays").text("");
    $("#stats_payments_sum").text("");
    $.ajax({
        url: "/attributes/total",
        data: {
            start: month_date.getTime(),
            end: next_month_date.getTime()
        },
        success: function (data) {
            $("#stats_payments_trains").text(data.trains);
            $("#stats_payments_visits").text(data.visits);
            $("#stats_payments_pays").text(data.pays);
            $("#stats_payments_sum").text(data.sum);
        },
        error: function (err) {
            handleError(err)
        }
    })

    if (paysChart && paysChart.destroy) paysChart.destroy()
    var ctx = document.getElementById("stats_payments_canvas");
    var labels = [];
    var counts = [];
    $.ajax({
        url: "/payments",
        data: {
            select: "sum",
            populate: "payer",
            where: JSON.stringify({ starts: { "<": next_month_date.getTime(), ">=": month_date.getTime() } })
        },
        async: false,
        success: function (payments) {
            for (var i = 0; i < payments.length; i++) {
                payments = payments.sort(compareByPayerToView)
                if (payments[i].payer){
                    if (labels.includes(payments[i].payer.toView)) {
                        counts[labels.indexOf(payments[i].payer.toView)] += payments[i].sum;
                    } else {
                        labels.push(payments[i].payer.toView)
                        counts.push(payments[i].sum);
                    }
                }
            }
        },
        error: function (err) {
            handleError(err);
        }
    })
    labels = cutLabels(labels)
    sortArraysByCounts(counts, labels)
    ctx.height = labels.length * 15;
    paysChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cумма оплаты',
                data: counts,
                backgroundColor: "#ffc107",
                borderColor: "#ffc107",
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

function cutLabels(labels){
    labels = labels.map(l => {
        let names = l.split(" ")
        let result = names[0]
        if (names[1]) result += " "+names[1]
        return result
    } )
    return labels;
}

function handleError(err) {
    try {
        if (err.responseJSON && err.responseJSON.code) {
            if (err.responseJSON.code == "E_UNIQUE") {
                alert("Запись(и) с таким наименованием(Фамилией Именем) уже содержится(атся) в базе данных.\nПопробуйте добавить к наименованию(Фамилии Имени) отличительную приписку\nНапример: Запись(новая)")
            } else if (err.responseJSON.code == "E_INVALID_NEW_RECORD") {
                alert("Все поля помеченные * обязательны для заполнения")
            } else {
                alert(JSON.stringify(err))
            }
        } else {
            if (err.status == 400 && err.responseText) {
                alert(err.responseText)
            } else {
                alert(JSON.stringify(err))
            }

        }
    } catch (error) {
        alert(JSON.stringify(err))
    }
}

function showStatsPayments() {
    clearBlocks();
    $("#stats_payments_block").show();
    $("#stats_payments_month_select").val((new Date()).getMonth())
    $("#stats_payments_year_input").val((new Date()).getFullYear())
    renderStatsPayments()
}

function setVisitsTableHeader(visits, table_name){
    let uniqueTrainNames = [];
    for (const name in visits) {
        let person_trains = visits[name]
        for (const train_str_date in person_trains) {
            if (!uniqueTrainNames.includes(train_str_date)){
                uniqueTrainNames.push(train_str_date)
            }
        }
    }
    $("#report_table_name").append("<th>"+table_name+"</th>")
    $("#report_table_head").append("<th>Фамилия Имя</th>")
    for (let i = 0; i < uniqueTrainNames.length; i++) {
        let name = uniqueTrainNames[i];
        let date_to_set = name == "Занятий" || name == "Оплата" ? name : addZeros(new Date(Number(name)).getDate())
        $("#report_table_head").append(`<th>${date_to_set}</th>`)
        $("#report_table_name").append("<th></th>")
    }
    return uniqueTrainNames
}

function getTime(datetime){
    return addZeros(new Date(datetime).getHours())+":"+addZeros(new Date(datetime).getMinutes())
}

let to_export_personal_trains = [];
function getPersonalCalendarEvents(start, end, timezone, callback) {
    if (!$("#personal_report_trener_select").val()) {
        $("#personal_report_stats_total_trains").text("0")
        $("#personal_report_stats_total_visits").text("0")
        $("#personal_report_stats_total_pays").text("0")
        $("#personal_report_stats_total_sum").text("0")
        return callback([]);
    }
    let current_start_date = start.date();
    let start_date = start;
    if (current_start_date != 1){
        start_date = start.add(1, 'months').startOf('month').valueOf();
    }
    let end_date = moment(start_date).endOf('month').valueOf();
    $.ajax({
        url: "/attributes/personal_report",
        data: {
            trener: $("#personal_report_trener_select").val(),
            start: start_date,
            end: end_date
        },
        success: function (trains) {
            to_export_personal_trains = trains;
            var events = [];
            let visits_count = 0;
            let payments_count = 0;
            let total_duration = moment.duration();
            let payments_sum = 0;
            let payments = {};
            for (var i = 0; i < trains.length; i++) {
                let start_moment = moment(trains[i].datetime);
                let end_moment = moment(trains[i].datetime_end);
                let train_duration = moment.duration(end_moment.diff(start_moment));
                total_duration = total_duration.add(train_duration);
                visits_count += trains[i].visits.filter(v => v.visit).length;
                let visits_payments = trains[i].visits.filter(v => v.payment);
                visits_payments.forEach(vp => {
                    payments[vp.payment_id] = vp.payment_sum;
                })
                let title = trains[i].visits.map(v => v.name.split(" ")[0]).join(' ')
                let time = new Date(trains[i].datetime).getHours()
                time += ":"+addZeros(new Date(trains[i].datetime).getMinutes())
                let time_add = ' - ' +  new Date(trains[i].datetime_end).getHours()
                time_add += ":"+addZeros(new Date(trains[i].datetime_end).getMinutes())
                var obj = {
                    id: trains[i].id,
                    start: new Date(trains[i].datetime),
                    end: new Date(trains[i].datetime_end),
                    time: time,
                    time_add: time_add,
                    title: title,
                    visits: trains[i].visits
                }
                events.push(obj)
            }
            for (const key in payments) {
                payments_count++;
                payments_sum +=payments[key];
            }
            $("#personal_report_stats_total_trains").text(`${trains.length}(${roundPlus(total_duration.asHours(),1)}ч.)`);
            $("#personal_report_stats_total_visits").text(visits_count)
            $("#personal_report_stats_total_pays").text(payments_count)
            $("#personal_report_stats_total_sum").text(payments_sum)
            callback(events);
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function roundPlus(x, n) { //x - число, n - количество знаков 
    if(isNaN(x) || isNaN(n)) return false;
    var m = Math.pow(10,n);
    return Math.round(x*m)/m;
  }
  

function renderPersonalReport(){
    $('#personal_report_calendar').fullCalendar('refetchEvents')
    $('#personal_report_calendar').fullCalendar('render')
}

function renderReport() {
    var group_id = $("#report_group_select").val()
    if (!group_id) return;
    var month = $("#report_months_select").val()
    var year = $("#report_year_input").val()
    var month_date = new Date(year, month);
    var next_month_date = new Date(year, month);
    next_month_date.setMonth(next_month_date.getMonth() + 1);
    $("#stats_total_trains").text("");
    $("#stats_total_visits").text("");
    $("#stats_total_pays").text("");
    $("#stats_total_sum").text("");
    $.ajax({
        url: "/attributes/total",
        data: {
            group: group_id,
            start: month_date.getTime(),
            end: next_month_date.getTime()
        },
        success: function (data) {
            $("#stats_total_trains").text(data.trains);
            $("#stats_total_visits").text(data.visits);
            $("#stats_total_pays").text(data.pays);
            $("#stats_total_sum").text(data.sum);
        },
        error: function (err) {
            handleError(err)
        }
    })
    $("#report_table_name").empty();
    $("#report_table_head").empty();
    $("#report_table_body").empty();

    $.ajax({
        url: '/attributes/get_visits',
        data: {
            group_id: group_id,
            start: month_date.getTime(),
            end: next_month_date.getTime()
        },
        success: function (data) {
            let table_name = `${$("#report_group_select option:selected").text()}, ${$("#report_months_select option:selected").text()}
            ${$("#report_year_input").val()}`;
            let train_names = setVisitsTableHeader(data, table_name)
            let count = 0;
            for (var person in data) {
                count++
                let row = "<tr>";
                row += `<th class="text-left">${count}. ${person}</th>`
                for (let i = 0; i < train_names.length; i++) {
                    const train_name = train_names[i];
                    if (train_name == "Занятий" || train_name == "Оплата"){
                        row += `<td>${data[person][train_name]}</td>`
                    } else {
                        let isVisit = data[person][train_name].visit; 
                        let isPayment = data[person][train_name].payment; 
                        row += `<td class="${isPayment ? 'bg-success' : ''}">${isVisit ? '+' : 'н'}</td>`
                    }
                    
                }
                row += "</tr>"
                $("#report_table_body").append(row);
            }
            $("#report_table_body").append(`<tr class="d-none"><td>Сумма платежей: ${$("#stats_total_sum").text()}</td></tr>`);
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function setDebtsTableHeader(debts){
    let uniqueGroupNames = [];
    for (const name in debts) {
        let person_groups = debts[name]
        for (const group in person_groups) {
            if (!uniqueGroupNames.includes(group)){
                uniqueGroupNames.push(group)
            }
        }
    }
    if (uniqueGroupNames.includes("Долг")){
        uniqueGroupNames.splice(uniqueGroupNames.indexOf("Долг"), 1);
        uniqueGroupNames.push("Долг")
    }
    if (uniqueGroupNames.includes("Всего")){
        uniqueGroupNames.splice(uniqueGroupNames.indexOf("Всего"), 1);
        uniqueGroupNames.push("Всего")
    }
    
    $("#debts_table_head").append("<th>Фамилия Имя</th>")
    for (let i = 0; i < uniqueGroupNames.length; i++) {
        $("#debts_table_head").append(`<th>${uniqueGroupNames[i]}</th>`)
    }
    return uniqueGroupNames
}

function updateDebtsTable(option, checked, select) {
    $("#debts_table_head").empty();
    $("#debts_table_body").empty();
    
    let groups = $("#debts_groups option:selected").map(function (){ 
        return {
            toView: $(this).text(),
            id: $(this).val()
        }
    }).get()
    
    if (!groups.length) return;

    $.ajax({
        url: "/attributes/debts?groups="+groups.map((g)=>g.id),
        success: function (data) {
            let group_names = setDebtsTableHeader(data)
            for (var person in data) {
                let row = "<tr>";
                row += `<th>${person}</th>`
                for (let i = 0; i < group_names.length; i++) {
                    const group_name = group_names[i];
                    row += data[person][group_name] ? `<td>${data[person][group_name]}</td>` : '<td>0</td>'
                }
                row += "</tr>"
                $("#debts_table_body").append(row);
            }
        },
        error: function (err) {
            handleError(err)
        }
    });
}

function renderDebts() {
    $("#debts_table_head").empty();
    $("#debts_table_body").empty();
    $.ajax({
        url: "/attributes/names?model=groups",
        success: function(groups){
            var options = []
            for (var i = 0; i < groups.length; i++) {
                options.push({label: groups[i].toView, value: groups[i].id})
            }
            $("#debts_groups").multiselect({ 
                buttonWidth: '350px',
                maxHeight: 200,
                buttonClass: 'btn btn-sm btn-flat',
                enableFiltering: true,
                buttonText: selectButtonText,
                onChange: updateDebtsTable
            });
            $("#debts_groups").multiselect('dataprovider', options);
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function showPersonalReports(){
    clearBlocks();
    $("#personal_report_block").show();
    
    $.ajax({
        url: "/attributes/get_treners",
        success: function (treners) {
            $("#personal_report_trener_select").empty();
            for (var i = 0; i < treners.length; i++) {
                $("#personal_report_trener_select").append('<option value="' + treners[i]._id + '">' + treners[i].toView + '</a>')
            }
            $("#personal_report_months_select").val((new Date()).getMonth())
            $("#personal_report_year_input").val((new Date()).getFullYear())
            renderPersonalReport();
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function showReports() {
    clearBlocks();
    $("#reports_block").show();
    $.ajax({
        url: "/attributes/names?model=groups",
        success: function (groups) {
            $("#report_group_select").empty();
            for (var i = 0; i < groups.length; i++) {
                $("#report_group_select").append('<option value="' + groups[i].id + '">' + groups[i].toView + '</a>')
            }
            $("#report_months_select").val((new Date()).getMonth())
            $("#report_year_input").val((new Date()).getFullYear())
            renderReport();
        },
        error: function (err) {
            handleError(err)
        }
    })
}

function showDebts() {
    clearBlocks();
    $("#debts_block").show();
    $("#debts_months_select").val((new Date()).getMonth())
    $("#debts_year_input").val((new Date()).getFullYear())
    renderDebts();
}

function exportReport() {
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById("report_table"), {raw: true }));
    var wopts = { bookType: 'xlsx', type: 'array' };
    let worksheet = wb.Sheets[wb.SheetNames[0]];
    deleteRow(worksheet, 2);
    worksheet['!cols'] = [{wch:50}];
    var wbout = XLSX.write(wb, wopts);
    var fileName = "Отчёт";

    var link = document.createElement("a");
    var blob = new Blob([wbout], { type: "application/octet-stream" });
    link.href = window.URL.createObjectURL(blob);
    link.style = "visibility:hidden";
    link.download = fileName + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportDebts() {
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(document.getElementById("debts_table"), {raw: true }));
    var wopts = { bookType: 'xlsx', type: 'array' };
    var wbout = XLSX.write(wb, wopts);
    var fileName = "Задолженности";
    var link = document.createElement("a");
    var blob = new Blob([wbout], { type: "application/octet-stream" });
    link.href = window.URL.createObjectURL(blob);
    link.style = "visibility:hidden";
    link.download = fileName + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportPersonalReport(){
    var wb = XLSX.utils.book_new();
    let aoa = [["Индивидуальные "+$("#personal_report_trener_select option:selected").text()+", "+$("#personal_report_calendar h4").text()]];
    aoa.push(["Дата и время", "Участники"])
    for(var i = 0; i < to_export_personal_trains.length; i++){
        let to_export_train = to_export_personal_trains[i];
        let train_members = "";
        for (let j = 0; j < to_export_train.visits.length; j++) {
            const visit = to_export_train.visits[j];
            if (!visit.visit) continue;
            train_members += visit.name.split(" ")[0]+ "; ";
        }
        if (!train_members) continue;
        aoa.push([moment(to_export_train.datetime).format("DD.MM HH:mm") + "-"+moment(to_export_train.datetime_end).format("HH:mm"), train_members]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa));
    let worksheet = wb.Sheets[wb.SheetNames[0]];
    worksheet['!cols'] = [{wch:20}, {wch:100}];
    var wopts = { bookType: 'xlsx', type: 'array' };
    var wbout = XLSX.write(wb, wopts);
    var fileName = "Индивидуальные";
    var link = document.createElement("a");
    var blob = new Blob([wbout], { type: "application/octet-stream" });
    link.href = window.URL.createObjectURL(blob);
    link.style = "visibility:hidden";
    link.download = fileName + ".xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function showPlans() {
    clearBlocks();
    $("#plans_block").show();
    $("#birthday_alert").empty();
    $.ajax({
        url: '/attributes/get_birthdays',
        success: function(persons){
            if (!persons.length)
                return;
            let birthlist = ""
            for (let i = 0; i < persons.length; i++) {
                const person = persons[i];
                birthlist += `<li>${person}</li>`
            }
            $("#birthday_alert").append(`<div class="alert alert-success" role="alert">Сегодня день рождения участников:<ul>${birthlist}</ul></div>`)
        },
        error: function (err) {
            handleError(err);
        }
    })
    $('#plans_calendar').fullCalendar('refetchEvents')
    $('#plans_day').fullCalendar('refetchEvents')
    $('#plans_calendar').fullCalendar('render')
    $('#plans_day').fullCalendar('render')
}

function getDebtDates(el) {
    $("#unpayed_dates").empty();
    if ($(el).val()){
        $.ajax({
            url: "/attributes/debt_dates",
            data: {
                payer: $(el).val()
            },
            success: function (data) {
                for (var i = 0; i < data.length; i++) {
                    $("#unpayed_dates").append(
                        '<div class="col-md-3 pointed" id="unpayed_' + data[i].group + data[i].starts + data[i].ends + '" data-type="'+(data[i].once ? "разовый" : "обычный")+'" data-payer="' + $("#pays_payer").val() + '" data-toView="' + data[i].toView + '" data-group="' + data[i].group + '"  data-starts="' + data[i].starts + '" data-ends="' + data[i].ends + '">\
                        <div class="card mb-3 box-shadow">\
                            <div class="card-body">\
                                <p class="card-text">'+ data[i].toView + '</p>\
                            </div>\
                        </div>\
                    </div>')
                    setElementEvent($("#unpayed_" + data[i].group + data[i].starts + data[i].ends), "click", function () {
                        $(".modal-save-btn").hide()
                        $("#add_pays_btn").show()
                        addModel("payments", {type: $(this).attr("data-type"), payer: $(this).attr("data-payer"), group: $(this).attr("data-group"), starts: $(this).attr("data-starts"), ends: $(this).attr("data-ends") })
                    })
                }
                var months_start = new Date()
                months_start = new Date(months_start.getFullYear(), months_start.getMonth(), 1).getTime()
                var months_end = new Date(months_start)
                months_end.setMonth(months_end.getMonth()+1)
                months_end = months_end.getTime()
                $("#unpayed_dates").append(
                    '<div class="col-md-3 pointed" id="unpayed_other" data-type="обычный" data-payer="' + $("#pays_payer").val() + '"  data-starts="' + months_start + '" data-ends="' + months_end + '">\
                    <div class="card mb-3 box-shadow">\
                        <div class="card-body">\
                            <p class="card-text">Другой платёж...</p>\
                        </div>\
                    </div>\
                </div>')
                setElementEvent($("#unpayed_other"), "click", function () {
                    $(".modal-save-btn").hide()
                    $("#add_pays_btn").show()
                    addModel("payments", {type: $(this).attr("data-type"), payer: $(this).attr("data-payer"), starts: $(this).attr("data-starts"), ends: $(this).attr("data-ends") })
                })
            },
            error: function (err) {
                handleError(err);
            }
        })
    }
}

function showPaysForm() {
    $("#pays_payer").empty();
    clearBlocks();
    $("#pays_block").show();
    $.ajax({
        url: "/persons/names_with_groups",
        success: function (persons) {
            if (!persons.length)
                return;
            var options = []
            persons = persons.sort(compareByToView);
            for (var i = 0; i < persons.length; i++) {
                options.push({label: persons[i].toView, value: persons[i].id, attributes: { groups: persons[i].groups.toString()}})   
            }
            $("#pays_payer").multiselect({ buttonWidth: '100%', maxHeight: 400, buttonClass: 'btn btn-sm btn-flat', enableFiltering: true, buttonText: selectButtonText })
            $("#pays_payer").multiselect('dataprovider', options);
            getDebtDates($("#pays_payer"))
            setElementEvent($("#pays_payer"), "change", function () {
                getDebtDates($(this))
            })
        },
        error: function (err) {
            handleError(err);
        }
    })
}

function showAddTrainDatepicker() {
    $(".modal-save-btn").hide()
    $("#add_group_train_btn").show()
    var defaults = {
        group: $("#group_trains").attr("data-id"),
        hall: $("#group_trains").attr("data-hall"),
        trener: $("#group_trains").attr("data-trener"),
        datetime: Number($("#group_trains").attr("data-datetime"))
    }
    if ($("#group_trains").attr("data-duration") && defaults.datetime) {
        var tmp_date = new Date(defaults.datetime);
        tmp_date.setMinutes(tmp_date.getMinutes() + Number($("#group_trains").attr("data-duration")));
        defaults.datetime_end = tmp_date.getTime();
    }
    addModel("trains", defaults)
}

function showAddGroupMember() {
    $(".modal-save-btn").hide()
    $("#save_group_member_btn").show()
    var id = $("#group_trains").attr("data-group")
    showEditModel(id, "groups")
}

function showAddTrainMember() {
    $(".modal-save-btn").hide()
    $("#save_train_member_btn").show()
    var id = $("#train_members").attr("data-id")
    showEditModel(id, "trains")
}

function showAddMemberToTrain() {
    $(".modal-save-btn").hide()
    $("#save_member_to_train_btn").show()
    var id = $("#train_members").attr("data-id")
    var group = $("#train_members").attr("data-group")
    addModel("persons", { trains: [id], groups: [group] })
}

function showEditGroup() {
    $(".modal-save-btn").hide()
    $("#save_group_btn").show()
    var id = $("#group_trains").attr("data-id")
    showEditModel(id, "groups")
}

function addGroupTrain() {
    saveModel("trains", function () {
        showTrainsList($("#group_trains").attr("data-id"), $("#group_trains").attr("data-label"))
    })
}

function addPlansTrain() {
    saveModel("trains", showPlans)
}

function addPay() {
    saveModel("payments", showPaysForm)
}

function saveTrainJournalAddMember() {
    saveModel("trains", function () {
        var id = $("#train_members").attr("data-id")
        $.ajax({
            url: '/trains/' + id,
            data: {
                populate: "updater"
            },
            success: function (train) {
                updateShowTrain(train.id, train.group, train.trener, train.toView)
            },
            error: function (err) {
                handleError(err)
            }
        })
    })
}

function saveGroupJournalAddMember() {
    saveModel("groups", function () {
        var id = $("#group_trains").attr("data-id")
        $.ajax({
            url: '/groups/' + id,
            data: {
                populate: "updater"
            },
            success: function (group) {
                showTrainsList(group.id, group.label)
            },
            error: function (err) {
                handleError(err)
            }
        })
    })
}

function saveMemberToTrain() {
    saveModel("persons", function () {
        var id = $("#train_members").attr("data-id")
        $.ajax({
            url: '/trains/' + id,
            data: {
                populate: "updater"
            },
            success: function (train) {
                updateShowTrain(train.id, train.group, train.trener, train.toView)
            },
            error: function (err) {
                handleError(err)
            }
        })
    })
}

function saveGroupEdit() {
    saveModel("groups", function () {
        var id = $("#group_trains").attr("data-id")
        $.ajax({
            url: '/groups/' + id,
            data: {
                populate: "updater"
            },
            success: function (group) {
                showTrainsList(id, group.toView)
            },
            error: function (err) {
                handleError(err)
            }
        })
    })
}

var personal_calendar_options = {
    header: {
        left: 'prev,next',
        center: 'title',
        right: null
    },
    themeSystem: "bootstrap4",
    height: "auto",
    allDaySlot: true,
    minTime: "08:00:00",
    maxTime: "23:59:59",
    timezone: "local",
    eventRender: function(event, element, view) {
        let visits = event.visits;
        let visits_str = '';
        visits.forEach(visit => {
            visits_str += `<div class="border-top" style="overflow-x: hidden; line-height: 1rem; ${visit.payment_type == "абонемент" || visit.available ? "background-color: rgba(200, 252, 210, 1);" : ""}">
            <small>${visit.name.split(" ")[0]}</small>
            <small class="d-none d-lg-inline"> ${visit.name.split(" ")[1]}</small><br class="d-none d-lg-inline"/>
            ${visit.visit ? '<i class="fa fa-check" title="Присутствовал"></i>' : '<i class="fa fa-close" title="Не присутствовал"></i>'}
            ${(visit.payment_type == "абонемент" && visit.payment_count && visit.payment_train_index != null)
                ? '<span class="badge badge-secondary">'+visit.payment_train_index+'/'+visit.payment_count+'</span>' 
                : '' }
            <span class="badge badge-${visit.payment ? 'success' : 'danger'}">${visit.payment ? visit.payment_sum : 'нет<span class="d-none d-lg-inline"> оплаты<span>'}</span>
            </div>`
        });
        return $(`<div class="bg-light border border-secondary rounded m-1 text-center">
        <small>${event.time}<span class="d-none d-lg-inline">${event.time_add}</span></small><br/>
        ${visits_str}
        </div>`);
    },
    events: getPersonalCalendarEvents
};

var plans_calendar_options = {
    header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek',
    },
    themeSystem: "bootstrap4",
    height: "auto",
    selectable: true,
    allDaySlot: false,
    minTime: "08:00:00",
    maxTime: "23:59:59",
    timezone: "local",
    dayClick: function (date) {
        $('#plans_day').fullCalendar('gotoDate', date._d);
    },
    eventClick: showEditPlansEvent,
    events: getPlansEvents
}

var plans_day_options = {
    defaultView: "agendaDay",
    header: { right: 'title', left: 'prev,next' },
    height: "auto",
    allDaySlot: false,
    minTime: "08:00:00",
    maxTime: "23:59:59",
    timezone: "local",
    themeSystem: "bootstrap4",
    selectable: true,
    eventAfterRender: function (event, element, view) {
        $(element).css('width', 'auto');
    },
    dayClick: function (date) {
        $(".modal-save-btn").hide()
        $("#add_plans_train_btn").show()
        var tmp_date = date._d.valueOf();
        var datetime_end = new Date(date._d.valueOf())
        datetime_end.setMinutes(datetime_end.getMinutes() + 60);
        addModel("trains", {
            datetime: tmp_date,
            datetime_end: datetime_end.getTime()
        })
    },
    eventAfterAllRender: function () {
        setElementEvent($(".fc-axis.fc-time"), "click", function () {
            $(".modal-save-btn").hide()
            $("#add_plans_train_btn").show()
            var tmp_date = moment($("#plans_day h4").text() + " " + $(this).parent().attr("data-time"), 'DD.MM.YYYY HH:mm');
            var datetime_end = new Date(tmp_date.valueOf())
            datetime_end.setMinutes(datetime_end.getMinutes() + 60);
            addModel("trains", {
                datetime: tmp_date.valueOf(),
                datetime_end: datetime_end.getTime()
            })
        })
    },
    eventClick: showEditPlansEvent,
    events: getPlansEvents
}

function showEditPlansEvent(calEvent, jsEvent, view) {
    $(".modal-save-btn").hide()
    $("#remove_plans_train_btn").show()
    $("#add_plans_train_btn").show()
    showEditModel(calEvent.id, "trains")
    setElementEvent($("#remove_plans_train_btn"), "click", function () {
        removePlansTrain(calEvent.id)
    });
}

function getWords(cb){
    $.ajax({
        url: "/attributes/get_words",
        success: function (data) {
            window.settings_words = data;
            $("#stats_treners_title").text("Отчёты по "+window.settings_words.for_treners)
            $("#stats_treners_menu_item").text("По "+window.settings_words.for_treners)
            $("#train_journal_trener_label").text(window.settings_words.trener+":");
            cb();
        },
        error: function (err) {
            handleError(err)
            cb();
        }
    })
}

function getPlansEvents(start, end, timezone, callback) {
    $.ajax({
        url: '/trains',
        data: {
            where: JSON.stringify({ datetime: { ">=": start.valueOf(), "<": end.valueOf() } }),
            limit: 999999,
            populate: "group"
        },
        success: function (trains) {
            var events = [];
            for (var i = 0; i < trains.length; i++) {
                if (trains[i].group && trains[i].group.toView) {
                    var obj = {
                        id: trains[i].id,
                        start: new Date(trains[i].datetime),
                        end: new Date(trains[i].datetime_end),
                        title: trains[i].group.toView
                    }
                    if (trains[i].hall.includes("фиолетовый")) {
                        obj.backgroundColor = 'var(--purple)';
                        obj.borderColor = 'var(--purple)';
                    } else if (trains[i].hall.includes("малый")) {
                        obj.backgroundColor = 'var(--info)';
                        obj.borderColor = 'var(--info)';
                    } else if (trains[i].hall.includes("серый")) {
                        obj.backgroundColor = 'var(--secondary)';
                        obj.borderColor = 'var(--secondary)';
                    } else if (trains[i].hall.includes("тренажерный")) {
                        obj.backgroundColor = 'var(--orange)';
                        obj.borderColor = 'var(--orange)';
                    } else if (trains[i].hall.includes("белый")) {
                        obj.backgroundColor = 'var(--cyan)';
                    } else if (trains[i].hall.includes("другой")) {
                        obj.backgroundColor = 'var(--pink)';
                        obj.borderColor = 'var(--pink)';
                    }
                    events.push(obj)
                }
            }
            callback(events);
        }
    });
}

function generateMonthTrains(){
    $.ajax({
        url: "/trains/generate_trains",
        async: false,
        success: function(){
            alert("Тренировки на оставшийся месяц успешно созданы")
        },
        error: function (err) { handleError(err) }
    })
    showPlans();
}

function generateNextMonthTrains(){
    $.ajax({
        url: "/trains/generate_next_month_trains",
        async: false,
        success: function(){
            alert("Тренировки на следующий месяц успешно созданы")
        },
        error: function (err) { handleError(err) }
    })
    showPlans();
}

function removePlansTrain(id) {
    $.ajax({
        url: "/trains/" + id,
        type: "DELETE",
        async: false,
        error: function (err) { handleError(err) }
    })
    $("#modal_dialog").modal('hide');
    setTimeout(function () {
        showPlans()
    }, 500)
}

function showSettingsForm(){
    $("#modal_title").text("Настройки")
    $(".modal-save-btn").hide()
    $("#save_settings_btn").show()
    $("#modal_body").html('<form>\
        <div class="form-group row">\
            <label for="sett_train" class="col-sm-2 col-form-label col-form-label-sm">Наименования занятий</label>\
            <div class="col-sm-10">\
                <select id="sett_train" class="form-control form-control-sm">\
                    <option>тренировка</option>\
                    <option>занятие</option>\
                    <option>урок</option>\
                    <option>репитиция</option>\
                </select>\
            </div>\
        </div>\
        <div class="form-group row">\
            <label for="sett_trener" class="col-sm-2 col-form-label col-form-label-sm">Наименования преподавателей</label>\
            <div class="col-sm-10">\
                <select id="sett_trener" class="form-control form-control-sm">\
                    <option>тренер</option>\
                    <option>преподаватель</option>\
                    <option>учитель</option>\
                </select>\
            </div>\
        </div>\
        <div class="form-group row">\
            <label for="sett_course" class="col-sm-2 col-form-label col-form-label-sm">Наименования курсов</label>\
            <div class="col-sm-10">\
                <select id="sett_course" class="form-control form-control-sm">\
                    <option>сборы</option>\
                    <option>курс</option>\
                </select>\
            </div>\
        </div>\
    </form>')
    $("#sett_train").val(window.settings_words.train.toLowerCase())
    $("#sett_trener").val(window.settings_words.trener.toLowerCase())
    $("#sett_course").val(window.settings_words.course.toLowerCase())
    $("#modal_dialog").modal();
}

function saveSettings(){
    $.ajax({
        url: "/attributes/set_words",
        data: {
            train: $("#sett_train").val(),
            trener: $("#sett_trener").val(),
            course: $("#sett_course").val()
        },
        success: function(){
            $("#modal_dialog").modal('hide')
            getWords(showTables);
        },
        error: function(err){
            handleError(err)
        }
    })
}

function createHandlers() {
    $("#auth_send_btn").on("click", sendAuth)
    $("#logout_btn").on("click", logout)
    $(".add_model_btn").on("click", function () { addModel() })
    $(".remove_models_btn").on("click", removeModels)
    $("#modal_save_btn").on("click", saveModel)
    $(".select_all_btn").on("click", selectAll)
    $(".count_on_page").on("change", updateLimitTable)
    $(".cur_page").on("change", updateLimitTable)
    $(".to_left_end_btn").on("click", toLeftEnd)
    $(".to_left_btn").on("click", toLeft)
    $(".to_right_btn").on("click", toRight)
    $(".to_right_end_btn").on("click", toRightEnd)
    $(".export_model_btn").on("click", exportModel)
    $(".import_model_btn").on("click", importModel)
    $("#fileInput").on("change", changeFileInput);
    $("#journals_menu_item").on("click", showJournals)
    $("#back_to_groups_btn").on("click", showJournals)
    $("#back_to_trains_btn").on("click", showLastTrainsList)
    $("#show_group_train_btn").on("click", showAddTrainDatepicker)
    $("#reports_menu_item").on("click", showReports)
    $("#personal_report_menu_item").on("click", showPersonalReports)
    $("#debts_menu_item").on("click", showDebts)
    $("#report_group_select").on("change", renderReport)
    $("#report_months_select").on("change", renderReport)
    $("#report_year_input").on("change", renderReport)
    $("#personal_report_trener_select").on("change", renderPersonalReport)
    $("#export_report_btn").on("click", exportReport)
    $("#personal_report_export_btn").on("click", exportPersonalReport)
    $("#export_debts_btn").on("click", exportDebts)
    $("#plans_menu_item").on("click", showPlans)
    $("#add_group_train_btn").on("click", addGroupTrain)
    $("#add_pays_btn").on("click", addPay)
    $("#add_train_member_btn").on("click", showAddTrainMember)
    $("#add_group_member_btn").on("click", showAddGroupMember)
    $("#add_member_to_train_btn").on("click", showAddMemberToTrain)
    $("#add_plans_train_btn").on("click", addPlansTrain)
    $('#plans_calendar').fullCalendar(plans_calendar_options)
    $('#personal_report_calendar').fullCalendar(personal_calendar_options)
    $('#plans_day').fullCalendar(plans_day_options)
    $("#stats_members_menu_item").on("click", showStatsMembers)
    $("#stats_treners_menu_item").on("click", showStatsTreners)
    $("#stats_payments_menu_item").on("click", showStatsPayments) 
    $("#trains_generate_menu_item").on("click", generateMonthTrains) 
    $("#next_month_trains_generate_menu_item").on("click", generateNextMonthTrains) 
    $("#save_train_member_btn").on("click", saveTrainJournalAddMember)
    $("#save_group_member_btn").on("click", saveGroupJournalAddMember)
    $("#save_member_to_train_btn").on("click", saveMemberToTrain)
    $("#save_group_btn").on("click", saveGroupEdit)
    $("#stats_payments_month_select").on("change", renderStatsPayments)
    $("#stats_payments_year_input").on("change", renderStatsPayments)
    $("#stats_treners_month_select").on("change", renderStatsTreners)
    $("#stats_treners_year_input").on("change", renderStatsTreners)
    $("#stats_members_month_select").on("change", renderStatsMembers)
    $("#stats_members_year_input").on("change", renderStatsMembers)
    $("#pays_menu_item").on("click", showPaysForm)
    $("#settings_btn").on("click", showSettingsForm)
    $("#save_settings_btn").on("click", saveSettings)
}

function init() {
    createHandlers()
    if (window.location.host == "demo.electrotik.ru"){
        $.ajax({
            url: "/auth/login",
            data: {
                login: "admin",
                password: "admin"
            },
            success: function (data) {
                window.profile = data;
                getWords(showTables)
            },
            error: function (err) {
                handleError(err)
            }
        })
    } else {
        $.ajax({
            url: "/users/get_profile",
            success: function (data) {
                window.profile = data;
                getWords(showTables)
            },
            error: function () {
                showAuth();
            }
        })
    }
}

init();