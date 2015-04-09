Package.describe({
    name: 'fis-iss',
    summary: 'Friends In Space - ISS Orbit package',
    version: '0.1.0'
});

Npm.depends({
    "geojson-utils": "1.1.0"
});

Package.onUse(function (api) {
    api.versionsFrom('0.9.4');

    api.use(['fis', 'fis-log', 'fis-online-map', 'http', 'mongo', 'mrt:moment', 'jbrousseau:meteor-collection-behaviours']);

    api.addFiles(['commons.js', 'iss.js', 'satellite.js'], ['client', 'server']);

    api.addFiles(['math.js', 'tle.js', 'orbits.js'], 'server');

    api.export(['CurrentOrbitModel','OrbitsModel', 'TwoLineElementsModel', 'Satellitejs']);
});
