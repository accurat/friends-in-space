Package.describe({
    name: 'fis',
    summary: 'Friends In Space - Main package ',
    version: '0.1.0'
});

Package.onUse(function (api) {
    api.versionsFrom('0.9.4');
    api.addFiles('namespaces.js', ['client','server']);
    api.export('FIS');
});