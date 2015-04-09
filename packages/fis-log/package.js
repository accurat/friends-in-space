Package.describe({
    name: 'fis-log',
    summary: 'Friends In Space - Logging service',
    version: '1.0.0'
});

Npm.depends({
    "color-console": "0.0.1",
    "sprintf-js":"0.0.7"
});

Package.onUse(function (api) {
    api.versionsFrom('0.9.4');
    api.use('fis');
    api.addFiles('log.js','server');
});
