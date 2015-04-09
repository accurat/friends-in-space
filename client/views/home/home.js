var previousState = null;

//clear UUID if we are reloading a new app version
if (Session.get(FIS.KEYS.APP_VERSION) != __meteor_runtime_config__.autoupdateVersion) {
    Session.setPersistent(FIS.KEYS.APP_VERSION, __meteor_runtime_config__.autoupdateVersion);

}

Session.set(FIS.KEYS.SHOW_HOME, true);
Session.set(FIS.KEYS.SHOW_FUTURE, false);
Session.set(FIS.KEYS.SHOW_PAST, false);
Session.set(FIS.KEYS.SHOW_CONTROL_ROOM, false);

Session.set(FIS.KEYS.ENABLE_VIDEO, false);
Session.set(FIS.KEYS.CURR_ORBIT_ID, null);
Session.set(FIS.KEYS.USER_LOC, null);
Session.set(FIS.KEYS.NOTIFICATION_TEXT, null);
Session.set(FIS.KEYS.SHOW_DISCLAIMER,false);


Meteor.startup(function () {


    Tracker.autorun(function () {
        var status = Meteor.status();
        if (previousState == null) {
            if (status.connected == true)
                previousState = status.connected;
        } else {

            if (previousState == false && status.connected == true) {
                firstTime = true;
                Session.set(FIS.KEYS.USER_LOC, null);
                findLocation();
            }
            previousState = status.connected;
        }
    });

});


function handleGeoLocationError(error) {

    Session.set(FIS.KEYS.USER_LOC_STATUS, 'not-found');

    switch (error.code) {
        case error.PERMISSION_DENIED:
            Session.set(FIS.KEYS.USER_LOC_STATUS, 'error-permission');
            break;
        case error.POSITION_UNAVAILABLE:
            Session.set(FIS.KEYS.USER_LOC_STATUS, 'error-unavailable');
            break;
        case error.TIMEOUT:
            Session.set(FIS.KEYS.USER_LOC_STATUS, 'error-timeout');
            break;
        case error.UNKNOWN_ERROR:
            Session.set(FIS.KEYS.USER_LOC_STATUS, 'error-unknow');
            break;
    }
}

findLocation = function () {
    Session.set(FIS.KEYS.USER_LOC_STATUS, 'searching');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            if (position != null) {
                var location = [position.coords.longitude, position.coords.latitude];

                Session.set(FIS.KEYS.USER_LOC, location);

                Session.set(FIS.KEYS.USER_LOC_STATUS, 'found');
            } else {
                Session.set(FIS.KEYS.USER_LOC_STATUS, 'not-found');
                console.error("No position found");
            }
        }, function (err) {
            handleGeoLocationError(err);
        });
    }
};
var firstTime = true;
var prevUserId;
function updateUserStatus(location, userId) {


    if (location) {

        //called at set location
        //if first time on app
        if (firstTime) {

            //saving meteor userId
            prevUserId = userId;

            //register user or guest
            if (userId) {
                Meteor.call('registerOnlineUserStatus', location, function (err, data) {
                    if (err) {
                        console.error("Error registering online user", err);
                    }
                });
            } else {
                if (Session.get(FIS.KEYS.UUID) == null) {
                    var uuid = Meteor.uuid();
                    Session.setPersistent(FIS.KEYS.UUID, uuid);
                }

                Meteor.call('registerOnlineGuestStatus', location, Session.get(FIS.KEYS.UUID), function (err, data) {
                    if (err) {
                        console.error("Error registering guest user", err);
                    }
                });
            }

            firstTime = false;
        } else {


            if (prevUserId == userId) {
                //just updated the location
                if (userId == null) {
                    //call register guest
                    Meteor.call('registerOnlineGuestStatus', location, Session.get(FIS.KEYS.UUID), function (err, data) {
                        if (err) {
                            console.error("Error registering guest user", err);
                        }
                    });
                } else {
                    Meteor.call('registerOnlineUserStatus', location, function (err, data) {
                        if (err) {
                            console.error("Error registering online user", err);
                        }
                    });
                }


            } else if (prevUserId != null && userId == null) {
                //from login to logout, already called registerOfflineStatus


                if (Session.get(FIS.KEYS.UUID) == null) {
                    var uuid = Meteor.uuid();
                    Session.setPersistent(FIS.KEYS.UUID, uuid);
                }


                //call register guest
                Meteor.call('registerOnlineGuestStatus', location, Session.get(FIS.KEYS.UUID), function (err, data) {
                    if (err) {
                        console.error("Error registering guest user", err);
                    }
                });

            } else if (prevUserId == null && userId != null) {

                //from logout to login, register offlinestatus

                Meteor.call('registerOfflineByConnection', function (err, data) {
                    if (err) {
                        console.error("Error registering online user", err);
                    }
                    Meteor.call('registerOnlineUserStatus', location, function (err, data) {
                        if (err) {
                            console.error("Error registering online user", err);
                        }
                    });
                });
            }

            prevUserId = userId;
        }
    }
}


//helpers for views open/close
Template.fisHome.helpers({
    showHome: function () {
        return Session.get(FIS.KEYS.SHOW_HOME);
    },
    showFuture: function () {
        return Session.get(FIS.KEYS.SHOW_FUTURE);
    },
    showPast: function () {
        return Session.get(FIS.KEYS.SHOW_PAST);
    },
    showControlRoom: function () {
        return Session.get(FIS.KEYS.SHOW_CONTROL_ROOM);
    },
    videoStatus: function () {
        return Session.get(FIS.KEYS.ENABLE_VIDEO)
    },
    showHome: function () {
        return Session.get(FIS.KEYS.SHOW_HOME);
    }
});


//events for views open/close
Template.fisHome.events({

    'click #fis-explore-past': function () {
        showBottomContainer();
    },
    'click .now-bar.top': function () {
        hideBottomContainer();
    },
    'click #fis-explore-future': function () {

        showTopContainer();
    },

    'click .now-bar.bottom': function () {
        hideTopContainer();
    },
    'click #toggle-video': function () {
        Session.set(FIS.KEYS.ENABLE_VIDEO, !Session.get(FIS.KEYS.ENABLE_VIDEO));
    },
    'click #back': function () {
        if (Session.get(FIS.KEYS.SHOW_PAST) || Session.get(FIS.KEYS.SHOW_CONTROL_ROOM)) {
            hideBottomContainer();
        } else if (Session.get(FIS.KEYS.SHOW_FUTURE)) {
            hideTopContainer();
        }
    },
    'click #show-fis-disclaimer': function () {
        console.log("SHOW DISCLAIMER");
        Session.set(FIS.KEYS.SHOW_DISCLAIMER, true);
    }
});


Template.fisHome.rendered = function () {

    this.autorun(function () {

        var location = Session.get(FIS.KEYS.USER_LOC);
        var userId = Meteor.userId();

        Tracker.nonreactive(function () {
            updateUserStatus(location, userId);

        });

    });

};


showBottomContainer = function (showControlRoom) {
    var viewBottomContainer = $('.view-container.bottom');
    var viewTopContainer = $('.view-container.top');
    var nowBar = $('.now-bar.top');
    var homeContainer = $('.home-container');
    var barTitle = $('.bar-title');
    var backgroundControls = $('.fis-background-controls');
    var fisLogo = $('.fis-logo');

    viewBottomContainer.css({
        top: window.innerHeight - 40,
        height: 'auto'
    });

    viewBottomContainer.animate({
        top: 40
    });

    viewTopContainer.animate({
        top: -40
    });

    nowBar.fadeIn();
    barTitle.fadeOut();
    fisLogo.fadeOut();

    homeContainer.fadeOut(function () {
        if (showControlRoom)
            Session.set(FIS.KEYS.SHOW_CONTROL_ROOM, true);
        else {
            Session.set(FIS.KEYS.SHOW_PAST, true);
        }
        Session.set(FIS.KEYS.SHOW_HOME, false);
    });
    backgroundControls.animate({
        top: 7
    });
};
hideBottomContainer = function () {

    var viewBottomContainer = $('.view-container.bottom');
    var viewTopContainer = $('.view-container.top');
    var nowBar = $('.now-bar.top');
    var homeContainer = $('.home-container');
    var barTitle = $('.bar-title');
    var backgroundControls = $('.fis-background-controls');
    var fisLogo = $('.fis-logo');
    viewBottomContainer.css({
        height: window.innerHeight - 40,
        top: 'auto'
    });
    viewBottomContainer.animate({
        height: 40
    });
    viewTopContainer.animate({
        top: 0
    });
    nowBar.hide();

    barTitle.fadeIn();
    fisLogo.fadeIn();

    homeContainer.fadeIn(function () {
        Session.set(FIS.KEYS.SHOW_PAST, false);
        Session.set(FIS.KEYS.SHOW_CONTROL_ROOM, false);
        Session.set(FIS.KEYS.SHOW_HOME, true);
    });
    backgroundControls.animate({
        top: 27
    });
};

showTopContainer = function () {
    var viewBottomContainer = $('.view-container.bottom');
    var viewTopContainer = $('.view-container.top');
    var nowBar = $('.now-bar.bottom');
    var barTitle = $('.bar-title');
    var homeContainer = $('.home-container');
    var backgroundControls = $('.fis-background-controls');
    var fisLogo = $('.fis-logo');
    nowBar.fadeIn();
    barTitle.fadeOut();
    fisLogo.fadeOut();

    viewTopContainer.animate({
        height: window.innerHeight - 40
    }, function () {
        viewTopContainer.css({
            top: 0,
            bottom: 40,
            height: 'auto'
        });
    });

    viewBottomContainer.animate({
        bottom: -40
    });

    homeContainer.fadeOut(function () {
        Session.set(FIS.KEYS.SHOW_HOME, false);
        Session.set(FIS.KEYS.SHOW_FUTURE, true);
    });
    backgroundControls.animate({top: window.innerHeight - 32},
        function () {
            backgroundControls.css({top: 'auto', bottom: 7});
        });
};
hideTopContainer = function () {
    var viewBottomContainer = $('.view-container.bottom');
    var viewTopContainer = $('.view-container.top');
    var nowBar = $('.now-bar.bottom');
    var homeContainer = $('.home-container');
    var barTitle = $('.bar-title');
    var backgroundControls = $('.fis-background-controls');
    var fisLogo = $('.fis-logo');

    viewTopContainer.animate({
        bottom: window.innerHeight - 40
    }, function () {
        viewTopContainer.css({
            top: 0,
            height: 40
        });
    });

    viewBottomContainer.animate({
        bottom: 0
    });

    nowBar.hide();
    barTitle.fadeIn();
    fisLogo.fadeIn();

    homeContainer.fadeIn(function () {
        Session.set(FIS.KEYS.SHOW_HOME, true);
        Session.set(FIS.KEYS.SHOW_FUTURE, false);
    });
    backgroundControls.animate({
        bottom: window.innerHeight - (27 + 25)
    }, function () {
        backgroundControls.css({
            top: 27,
            bottom: 'auto'
        });
    });
};