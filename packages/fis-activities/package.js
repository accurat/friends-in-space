Package.describe({
    name: 'fis-activities',
    summary: 'Friends In Space - Activities package ',
    version: '0.1.0'
});



Package.onUse(function (api) {
    api.versionsFrom('0.9.4');
    api.use(['fis','http','mongo']);

    api.addFiles('commons.js',['client','server']);
    api.addFiles(['orbit-activities.js','online-status.js'],'server');
    api.export(['OnlineStatusModel','OrbitActivitiesModel']);
});
