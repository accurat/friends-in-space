Package.describe({
  name: 'fis-online-map',
  summary: ' /* Fill me in! */ ',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.4');
  api.addFiles(['ol.js','arc.js','fis-online-map.js','fis-small-orbit-chart.js'],'client');
  api.export(['goog','ArcJs','OnlineMap','SmallOrbitChart']);

});
