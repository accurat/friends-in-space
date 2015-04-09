var logger = FIS.Log.getLogger('startup');
logger.info("Starting Friends in space on [%s][%s] server ...",process.env.NODE_ROLE);


if (process.env.NODE_ROLE == 'master') {

    //SETUP LOGIN CONFIG
    logger.info("Setup accounts configurations...");

    ServiceConfiguration.configurations.remove({service: "twitter"});
    ServiceConfiguration.configurations.remove({service: "google"});
    ServiceConfiguration.configurations.remove({service: "facebook"});


    ServiceConfiguration.configurations.insert({
        service: "twitter",
        consumerKey: process.env.FIS_TWT_KEY,
        secret: process.env.FIS_TWT_SECRET,
        loginStyle: "popup"
    });
    ServiceConfiguration.configurations.insert({
        service: "facebook",
        appId: process.env.FIS_FB_KEY,
        secret: process.env.FIS_FB_SECRET,
        loginStyle: "popup"
    });
    ServiceConfiguration.configurations.insert({
        service: "google",
        clientId: process.env.FIS_GPLUS_KEY,
        secret: process.env.FIS_GPLUS_SECRET,
        loginStyle: "popup"
    });


}


Meteor.startup(function () {



    //only master node will update TLE and Orbits
    if (process.env.NODE_ROLE == 'master') {

        //clear online activities, start from a clean online status at startup
        FIS.OnlineStatus.clearOnlineStatus();

        FIS.TLE.startAutoUpdate();
        FIS.Orbits.startAutoUpdate();



        //start sam feeds listener
        Feed.init();
        Feed.firstFetch();
        Feed.start();
    }

    //configuring exposed methods
    configureOnlineStatusMethods();
    configureOrbitMethods();
    configureUsersMethods();

});


//USER LOGIN PROFILE
Accounts.onCreateUser(function (options, user) {

    logger.info('NEW USER sign in %s', user);
    // We still want the default hook's 'profile' behavior.
    if (options.profile)
        user.profile = options.profile;

    //loggedin with facebook
    if (user.services.facebook) {
        user.profile.service = 'facebook';
        user.profile.profileLink = user.services.facebook.link;
        user.profile.profileImage = "http://graph.facebook.com/" + user.services.facebook.id + "/picture?height=100"
    }
    if (user.services.twitter) {
        user.profile.service = 'twitter';
        user.profile.profileLink = "https://twitter.com/" + user.services.twitter.screenName;
        user.profile.profileImage = user.services.twitter.profile_image_url.replace('normal', 'bigger');
        user.profile.twitterScreenName = user.services.twitter.screenName;
    }
    if (user.services.google) {
        user.profile.service = 'google';
        user.profile.profileLink = "https://plus.google.com/" + user.services.google.id + "/posts";
        user.profile.profileImage = user.services.google.picture;
    }

    return user;
});


function configureOnlineStatusMethods() {



    //user online status
    Meteor.methods({
        saveLinkGreetingActivity: function (userType, startUserId, endUserId, started) {
            if (this.userId && userType == 'user') {
                FIS.OrbitActivities.updateLinkGreetingActivity(this.userId, userType, startUserId, endUserId, started);
            } else {
                var guestUser = OnlineStatusModel.findOne({connections:this.connection.id},{fields:{userId:1}});
                if(guestUser){
                    FIS.OrbitActivities.updateLinkGreetingActivity(guestUser.userId, userType, startUserId, endUserId, started);
                }

            }
        },
        sendEarthGreetings: function (guestId) {
            if (this.userId) {
                FIS.OnlineStatus.saveEarthGreetings(this.userId, this.connection.id);
            } else if (guestId) {
                FIS.OnlineStatus.saveEarthGreetings(guestId, this.connection.id);
            }
        },
        sendSamGreetings: function (guestId, distance) {
            if (this.userId) {
                FIS.OnlineStatus.saveSamGreetings(this.userId, this.connection.id, distance);
            } else if (guestId) {
                FIS.OnlineStatus.saveSamGreetings(guestId, this.connection.id, distance);
            }
        },
        registerOnlineUserStatus: function (location) {
            if (this.userId) {
                logger.debug("USER registered", this.userId);
                FIS.OnlineStatus.setOnlineActivity(this.userId, FIS.USER_TYPE.USER, this.connection.id, location);
            }
        },
        registerOnlineGuestStatus: function (location, guestId) {
            if (guestId) {
                logger.debug("GUEST registered", guestId);
                FIS.OnlineStatus.setOnlineActivity(guestId, FIS.USER_TYPE.GUEST, this.connection.id, location);
            } else {
                logger.error('GUEST registering with null guestId');
            }
        },

        registerOfflineByConnection: function () {
            FIS.OnlineStatus.setOfflineActivity(this.connection.id);
        }
    });

    var connectionsIds = [];

    Meteor.onConnection(function (connection) {
        var connectionId = connection.id;
        if(connectionsIds.indexOf(connectionId) == -1){
            connectionsIds.push(connectionId);
        }else{
            logger.error("Same connection already existing on this servo: %s ids: %s", connectionId, connectionsIds);
        }


        connection.onClose(function () {
            FIS.OnlineStatus.setOfflineActivity(connectionId);
            var index = connectionsIds.indexOf(connectionId);
            if(index!= -1){
                connectionsIds.splice(index,1);
            }else{
                logger.error("Can't find a connection id on this servo: %s ids: %s", connectionId, connectionsIds);
            }

        });
    });

    Modulus.onRestart = function(){
        logger.info("Restarting servo: updating user connections %s",connectionsIds);
        for(var i = 0; i < connectionsIds.length; i++){
            var connectionId = connectionsIds[i];
            FIS.OnlineStatus.setOfflineActivity(connectionId);
        }
        connectionsIds = [];
    };
    Modulus.onStop = function(){
        logger.info("Stopping servo: updating user connections %s",connectionsIds);
        for(var i = 0; i < connectionsIds.length; i++){
            var connectionId = connectionsIds[i];
            FIS.OnlineStatus.setOfflineActivity(connectionId);
        }
        connectionsIds = [];
    };
    Modulus.onDeploy = function(){
        logger.info("Deploying servo: updating user connections %s",connectionsIds);
        for(var i = 0; i < connectionsIds.length; i++){
            var connectionId = connectionsIds[i];
            FIS.OnlineStatus.setOfflineActivity(connectionId);
        }
        connectionsIds = [];
    };


}


function configureOrbitMethods() {

    Meteor.methods({

        getLastTLE: function () {
            return FIS.TLE.getLastTLE();
        },
        getTLEByTimestamp: function (timestamp) {
            return FIS.TLE.getTLEbyTimestamp(timestamp);
        },
        userOrbitChart: function (orbitId) {
            var data = {
                users: OrbitActivitiesModel.find({orbitId: orbitId}).fetch(),
                orbit: OrbitsModel.findOne({orbitId: orbitId})
            };

            return data;

        }


    });
}

function configureUsersMethods() {


    Meteor.publish("fisUsersOnOrbits", function (orbits, limit) {
        if (limit > Meteor.users.find().count()) {
            limit = 0;
        }
        if (this.userId && Object.prototype.toString.call(orbits) === '[object Array]') {
            return Meteor.users.find({_id: {$ne: this.userId}, 'profile.orbits': {$in: orbits}}, {limit: limit, sort: {'profile.name': 1}});
        } else
            return [];
    });

    Meteor.methods({

        getUser: function (userId) {
            var user = Meteor.users.findOne({_id: userId}, {fields: {profile: 1}});
            return user;
        },
        countUsersInOrbit: function (orbits) {
            if (orbits != null && Object.prototype.toString.call(orbits) === '[object Array]') {
                return Meteor.users.find({_id: {$ne: this.userId}, 'profile.orbits': {$in: orbits}}).count();
            } else {
                return 0;
            }

        }

    });
}