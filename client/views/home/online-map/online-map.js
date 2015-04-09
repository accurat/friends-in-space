//TODO ADD LOADER

var orbitSubscription, onlineStatusSubscription, currentSamGreetingsSub,onlineStatusModelHandler, currentOrbitHandler, currentSamGreetingsHandler;


Template.fisOnlineMap.destroyed = function () {
    orbitSubscription.stop();
    onlineStatusSubscription.stop();
    currentSamGreetingsSub.stop();
    onlineStatusModelHandler.stop();
    currentOrbitHandler.stop();
    currentSamGreetingsHandler.stop();
    OnlineMap.destroy();

};

Template.fisOnlineMap.events({
    'click #fis-reset-zoom': function () {
        OnlineMap.resetZoom();
    },
    'click #fis-hide-map': function () {
        OnlineMap.hideMap();
        Session.set('fis-map-shown', false);
    },
    'click #fis-show-map': function () {
        OnlineMap.showMap();
        Session.set('fis-map-shown', true);
    }
});
Template.fisOnlineMap.helpers({
    mapShown: function () {
        return Session.get('fis-map-shown');
    }
});

Template.fisOnlineMap.rendered = function () {
    Session.set('fis-map-shown', false);
    orbitSubscription = Meteor.subscribe('fisCurrentOrbit');
    onlineStatusSubscription = Meteor.subscribe('fisOnlineStatus');
    currentSamGreetingsSub = Meteor.subscribe('fisCurrentSamGreeting');


    OnlineMap.init("#fis-online-map");
    OnlineMap.hideMap();


    onlineStatusModelHandler = OnlineStatusModel.find().observe({
        added: function (user) {
            OnlineMap.addOnlineUser(user);
        },
        removed: function (user) {
            OnlineMap.removeOnlineUser(user);
        },
        changed: function (user) {
            OnlineMap.updateOnlineUser(user);
        }
    });


    currentOrbitHandler = CurrentOrbitModel.find().observe({
        added: function (orbitData) {

            Session.set(FIS.KEYS.CURR_ORBIT_ID, orbitData.orbitId);

            var orbit = FIS.ISS.getOrbit(orbitData.tle, 1, 's', moment.utc());
            OnlineMap.updateCurrentOrbit(orbit);
            OnlineMap.updateISSPosition(moment.utc().valueOf());
        },
        changed: function (orbitData) {
            Session.set(FIS.KEYS.CURR_ORBIT_ID, orbitData.orbitId);
            var orbit = FIS.ISS.getOrbit(orbitData.tle, 1, 's', moment.utc());
            OnlineMap.updateCurrentOrbit(orbit);
            OnlineMap.updateISSPosition(moment.utc().valueOf());

        }
    });


    currentSamGreetingsHandler = CurrentSamGreetingsModel.find().observe({
        added: function (samGreeting) {
            OnlineMap.addCurrentSamGreeting(samGreeting);
            Session.set(FIS.KEYS.NOTIFICATION_TEXT, 'Samantha is saying hello from Space!');
        },
        changed: function (samGreeting) {
            OnlineMap.updateCurrentSamGreeting(samGreeting);
            Session.set(FIS.KEYS.NOTIFICATION_TEXT, 'Samantha is saying hello from Space!');
        },
        removed: function(samGreeting){
            OnlineMap.removeCurrentSamGreeting(samGreeting);
            Session.set(FIS.KEYS.NOTIFICATION_TEXT, null);
        }
    });

    Meteor.setInterval(function () {
        OnlineMap.updateISSPosition(moment.utc().valueOf());
    }, 1000);

    Meteor.setInterval(function () {
        //update every minute the user layer for cluster data
        //TODO FIX THIS BUT REMEMBER TO UPDATE USER ONLINE STATUS
        OnlineMap.updateOnlineUserLayer();
    }, 1000);

    Meteor.setInterval(function(){
        OnlineMap.updateConstellation();
    },1000*20);
};


