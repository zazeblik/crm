module.exports.cron = {
    Job: {
      schedule: '0 0 0 1 * *',
      onTick: async function () {
        sails.log("Create trains");
        await sails.helpers.trainsGenerate();
      }
    }
  };