Package.describe({
    name: 'fis-fake-data',
    summary: 'Friends in space - Fake Data',
    version: '1.0.0'
});

Package.onUse(function(api) {
    api.versionsFrom('1.0');
    api.use(['mrt:chance','fis-iss','mrt:moment']);
    api.addFiles('fake.js','server');
    api.export('Fake');
});
