Package.describe({
  name: 'modulus-operations',
  summary: ' /* Fill me in! */ ',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

Npm.depends({
  "express": "4.10.4",
  "body-parser":"1.9.3"
});


Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.addFiles('modulus_operations.js','server');
  api.export('Modulus');
});