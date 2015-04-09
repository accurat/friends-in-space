Package.describe({
  name: 'fis-future-past-map',
  summary: 'Friends in space - Future and Past Maps',
  version: '1.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use(['d3','fis-iss','fis-online-map']);
  api.addFiles(['IssOrbit.js','IssTracker.js'],'client');
  api.export(['IssOrbit','IssTracker']);
});
