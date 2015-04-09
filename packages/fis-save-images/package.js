Package.describe({
  name: 'fis-save-images',
  summary: 'Friends in space - Images',
  version: '1.0.0'
});

Npm.depends({
  "form-data": "0.1.3"
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('http');
  api.addFiles('fis-save-images.js','server');

});
