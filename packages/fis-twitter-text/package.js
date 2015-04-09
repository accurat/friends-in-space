Package.describe({
    name: 'fis-twitter-text',
    summary: 'Friends In Space - Twitter text',
    version: '0.1.0'
});

Package.onUse(function (api) {
    api.versionsFrom('1.0');
    api.addFiles('twitter-text.js', ['client','server']);
    api.export("TwitterText");
});