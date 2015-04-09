Template.fisControlRoomProfile.helpers({

    onOrbit: function () {
        var user = Session.get(FIS.KEYS.USER);

        if (user && user.onOrbit)
            return "on-orbit";
        else
            return "";
    },
    userName: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return Meteor.user().profile.name;
        }
        return "";
    },
    userProfileImage: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return "url(" + Meteor.user().profile.profileImage + ")";
        } else {
            return null;
        }
    },
    userProfileLink: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return Meteor.user().profile.profileLink;
        } else {
            return null;
        }
    },
    userLocationDetected: function () {
        return Session.get(FIS.KEYS.USER_LOC_STATUS) == 'found';
    },
    userLocation: function () {
        var coords = Session.get(FIS.KEYS.USER_LOC);
        if (coords != null)
            return OnlineMap.formatCoords(coords);
        else
            return Session.get(FIS.KEYS.USER_LOC_STATUS);
    },
    userFriends: function () {
        var friends = 0;
        if (Meteor.userId() && Meteor.user() != null) {
            if (Meteor.user().profile.friends)
                friends =  Meteor.user().profile.friends.length;
        }
        switch(friends){
            case 1:
                return '1 FRIEND';
            default:
                return friends+" FRIENDS";
        }
    },
    userOrbits: function () {
        var orbits = 0;
        if (Meteor.userId() && Meteor.user() != null) {
            if (Meteor.user().profile.onOrbit)
                orbits =  Meteor.user().profile.onOrbit.length;
        }
        switch(orbits){
            case 1:
                return '1 ORBIT';
            default:
                return orbits+" ORBITS";
        }
    }
});

var userMap;
Template.fisControlRoomProfile.rendered = function(){
    var baseLayer = new ol.layer.Tile({
        source: new ol.source.OSM({
            url: 'https://a.tiles.mapbox.com/v3/accurat.k6o69p8d/{z}/{x}/{y}.png'
        })
    });
    var coords = Session.get(FIS.KEYS.USER_LOC);

    userMap = new ol.Map({
        controls: [],
        interactions: [],
        logo: false,
        target: Template.instance().$('.map')[0],
        layers: [baseLayer],
        view: new ol.View({
                center: ol.proj.transform([0,0], 'EPSG:4326', 'EPSG:3857'),
                zoom: 5
            }
        )
    });

    this.autorun(function(){
        var coords = Session.get(FIS.KEYS.USER_LOC);
        if(coords){
            userMap.getView().setCenter(ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857'));
        }

    })

};

Template.fisControlRoomPeople.destroyed = function () {
    userMap.setTarget();
    userMap = null;
};