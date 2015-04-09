Package.describe({
    name: 'fis-sam-feeds',
    summary: 'Friends In Space - Sam\'s feed',
    version: '0.1.0'
});

Npm.depends({
    "twit": "1.1.18"
});

Package.onUse(function (api) {
    api.versionsFrom('0.9.4');
    api.use(['fis', 'fis-log', 'mongo']);
    api.addFiles('commons.js');
    api.addFiles('sam-feed.js', 'server');
    api.export(['Feed','SamFeedModel','CurrentSamGreetingsModel']);
});