const datetimes = ["datetime","datetime_end","starts","ends","updatedAt","createdAt"]
const dates = ["birthday"]

module.exports.blueprints = {

  /***************************************************************************
  *                                                                          *
  * Automatically expose implicit routes for every action in your app?       *
  *                                                                          *
  ***************************************************************************/

  actions: true,


  /***************************************************************************
  *                                                                          *
  * Automatically expose RESTful routes for your models?                     *
  *                                                                          *
  ***************************************************************************/

  rest: true,


  /***************************************************************************
  *                                                                          *
  * Automatically expose CRUD "shortcut" routes to GET requests?             *
  * (These are enabled by default in development only.)                      *
  *                                                                          *
  ***************************************************************************/

  shortcuts: true,
  parseBlueprintOptions: function(req) {
    var DEFAULT_LIMIT = 99999;
    var DEFAULT_POPULATE_LIMIT = 99999;
    var blueprint = req.options.blueprintAction;
    var model = req.options.action.split('/')[0];
    if (!model) { throw new Error(util.format('No "model" specified in route options.')); }
    var Model = req._sails.models[model];
    if ( !Model ) { throw new Error(util.format('Invalid route option, "model".\nI don\'t know about any models named: `%s`',model)); }
    var defaultPopulates = _.reduce(Model.associations, function(memo, association) {
      if (association.type === 'collection') {
        memo[association.alias] = {
          where: {},
          limit: DEFAULT_POPULATE_LIMIT,
          skip: 0,
          select: [ '*' ],
          omit: []
        };
      } else {
        memo[association.alias] = {};
      }
      return memo;
    }, {});
  
    var queryOptions = {
      using: model,
      populates: defaultPopulates
    };
  
    switch (blueprint) {
      case 'find':
      case 'findOne':
        queryOptions.criteria = {};
        queryOptions.criteria.where = (function getWhereCriteria(){
          var where = {};
          if (blueprint === 'findOne') {
            where[Model.primaryKey] = req.param('id');
            return where;
          }
          where = req.allParams().where;
          if (_.isString(where)) {
            try {
              where = JSON.parse(where);
            } catch (e) {
              throw flaverr({ name: 'UsageError' }, new Error('Could not JSON.parse() the provided `where` clause. Here is the raw error: '+e.stack));
            }
          }
  
          if (!where) {
            where = req.allParams();
            where = _.omit(where, ['limit', 'skip', 'sort', 'populate', 'select', 'omit']);
            where = _.omit(where, function(p) {
              if (_.isUndefined(p)) { return true; }
            });
          }
          return where;
        })();
        if (!_.isUndefined(req.param('select'))) {
          queryOptions.criteria.select = req.param('select').split(',').map(function(attribute) {return attribute.trim();});
        } else if (!_.isUndefined(req.param('omit'))) {
          queryOptions.criteria.omit = req.param('omit').split(',').map(function(attribute) {return attribute.trim();});
        }
        if (!_.isUndefined(req.param('limit'))) {
          queryOptions.criteria.limit = req.param('limit');
        } else {
          queryOptions.criteria.limit = DEFAULT_LIMIT;
        }
        if (!_.isUndefined(req.param('skip'))) { queryOptions.criteria.skip = req.param('skip'); }
        if (!_.isUndefined(req.param('sort'))) {
          queryOptions.criteria.sort = (function getSortCriteria() {
            var sort = req.param('sort');
            if (_.isUndefined(sort)) {return undefined;}
            if (_.isString(sort)) {
              try {
                sort = JSON.parse(sort)
              } catch(unusedErr) {}
            }
            return sort;
          })();
        }
        if (req.param('populate')) {
          queryOptions.populates = (function getPopulates() {
            var attributes = req.param('populate');
            if (attributes === 'false') {
              return {};
            }
            attributes = attributes.split(',');
            attributes = _.reduce(attributes, function(memo, attribute) {
              memo[attribute.trim()] = {};
              return memo;
            }, {});
            return attributes;
          })();
        }
        break;
      case 'create':
        queryOptions.meta = { fetch: true };
        queryOptions.newRecord = (function getNewRecord(){
          var values = req.allParams();
          _.each(Model.attributes, function(attrDef, attrName) {
            if (attrDef.collection && (!req.body || !req.body[attrName]) && (req.query && _.isString(req.query[attrName]))) {
              try {
                values[attrName] = JSON.parse(req.query[attrName]);
              } catch(unusedErr) {}
            }
          });
          return values;
        })();
        break;
      case 'update':
        queryOptions.criteria = {
          where: {}
        };
        queryOptions.criteria.where[Model.primaryKey] = req.param('id');
        //queryOptions.meta = { fetch: true };
        queryOptions.valuesToSet = (function getValuesToSet(){
          var values = _.omit(req.allParams(), 'id');
          for (var value in values){
            if ((dates.includes(value) || datetimes.includes(value)) && (values[value] == '' || values[value] == 'NaN')) values[value] = null;
            if (value == 'partner' && values[value] == '') values[value] = null;
          }
          if (typeof values[Model.primaryKey] !== 'undefined' && values[Model.primaryKey] !== queryOptions.criteria.where[Model.primaryKey]) {
            req._sails.log.warn('Cannot change primary key via update blueprint; ignoring value sent for `' + Model.primaryKey + '`');
          }
          values[Model.primaryKey] = queryOptions.criteria.where[Model.primaryKey];
          
          return values;
        })();
        break;
      case 'destroy':
        queryOptions.criteria = {};
        queryOptions.criteria = {
          where: {}
        };
        queryOptions.criteria.where[Model.primaryKey] = req.param('id');
        queryOptions.meta = { fetch: true };
        break;
      case 'add':
        if (!req.options.alias) {
          throw new Error('Missing required route option, `req.options.alias`.');
        }
        queryOptions.alias = req.options.alias;
        queryOptions.targetRecordId = req.param('parentid');
        queryOptions.associatedIds = [req.param('childid')];
        break;
      case 'remove':
        if (!req.options.alias) {
          throw new Error('Missing required route option, `req.options.alias`.');
        }
        queryOptions.alias = req.options.alias;
        queryOptions.targetRecordId = req.param('parentid');
        queryOptions.associatedIds = [req.param('childid')];
        break;
      case 'replace':
        if (!req.options.alias) {
          throw new Error('Missing required route option, `req.options.alias`.');
        }
        queryOptions.alias = req.options.alias;
        queryOptions.criteria = {};
        queryOptions.criteria = {
          where: {}
        };
        queryOptions.targetRecordId = req.param('parentid');
        queryOptions.associatedIds = _.isArray(req.body) ? req.body : req.query[req.options.alias];
        if (_.isString(queryOptions.associatedIds)) {
          try {
            queryOptions.associatedIds = JSON.parse(queryOptions.associatedIds);
          } catch (e) {
            throw flaverr({ name: 'UsageError', raw: e }, new Error(
              'The associated ids provided in this request (for the `' + req.options.alias + '` collection) are not valid.  '+
              'If specified as a string, the associated ids provided to the "replace" blueprint action must be parseable as '+
              'a JSON array, e.g. `[1, 2]`.'
            ));
          }
        }
        break;
      case 'populate':
        if (!req.options.alias) {
          throw new Error('Missing required route option, `req.options.alias`.');
        }
        var association = _.find(Model.associations, {alias: req.options.alias});
        if (!association) {
          throw new Error('Consistency violation: `populate` blueprint could not find association `' + req.options.alias + '` in model `' + Model.globalId + '`.');
        }
        queryOptions.alias = req.options.alias;
        queryOptions.criteria = {};
        queryOptions.criteria = {};
        queryOptions.criteria = {
          where: {}
        };
        queryOptions.criteria.where[Model.primaryKey] = req.param('parentid');
        queryOptions.populates = {};
        queryOptions.populates[req.options.alias] = {};
        if (association.collection) {
          queryOptions.populates[req.options.alias].where = (function getPopulateCriteria(){
            var where = req.allParams().where;
            if (_.isString(where)) {
              try {
                where = JSON.parse(where);
              } catch (e) {
                throw flaverr({ name: 'UsageError' }, new Error('Could not JSON.parse() the provided `where` clause. Here is the raw error: '+e.stack));
              }
            }
            if (!where) {
              where = req.allParams();
              where = _.omit(where, ['limit', 'skip', 'sort', 'populate', 'select', 'omit', 'parentid']);
              where = _.omit(where, function(p) {
                if (_.isUndefined(p)) { return true; }
              });
            }
            return where;
          })();
        }
        if (!_.isUndefined(req.param('select'))) {
          queryOptions.populates[req.options.alias].select = req.param('select').split(',').map(function(attribute) {return attribute.trim();});
        } else if (!_.isUndefined(req.param('omit'))) {
          queryOptions.populates[req.options.alias].omit = req.param('omit').split(',').map(function(attribute) {return attribute.trim();});
        }
        if (!_.isUndefined(req.param('limit'))) {
          queryOptions.populates[req.options.alias].limit = req.param('limit');
        } else if (association.collection) {
          queryOptions.populates[req.options.alias].limit = DEFAULT_LIMIT;
        }
        if (!_.isUndefined(req.param('skip'))) { queryOptions.populates[req.options.alias].skip = req.param('skip'); }
        if (!_.isUndefined(req.param('sort'))) {
          queryOptions.populates[req.options.alias].sort = (function getSortCriteria() {
            var sort = req.param('sort');
            if (_.isUndefined(sort)) {return undefined;}
            if (_.isString(sort)) {
              try {
                sort = JSON.parse(sort);
              } catch(unusedErr) {}
            }
            return sort;
          })();
        }
        break
    }
    return queryOptions;
  }  
};
