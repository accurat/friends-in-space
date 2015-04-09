Package.describe({
    name: 'perfect-scrollbar',
    summary: 'Perfect Scrollbar',
    version: '1.0.0'
});


Package.onUse(function (api) {
    api.versionsFrom('0.9.4');
    api.use('jquery');
    api.addFiles(['perfect-scrollbar.min.css','perfect-scrollbar.min.js'],'client');
});
