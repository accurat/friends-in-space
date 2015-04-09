//--------------------------------------------
//---------- ONLINE ACTIVITY METHODS ---------
//--------------------------------------------


function saveEarthGreetings(userId, connectionId) {

    var timestamp = moment.utc().valueOf();
    var orbit = FIS.Orbits.getCurrentOrbit();
    FIS.OrbitActivities.updateEarthGreetingActivity(orbit.orbitId, userId, timestamp);

    return OnlineStatusModel.update({userId: userId, connections: connectionId}, {
        $set: {
            lastActivity: timestamp,
            earthGreetingsActivity: timestamp
        }
    });
}

function saveSamGreetings(userId, connectionId, distance) {

    var timestamp = moment.utc().valueOf();
    var orbit = FIS.Orbits.getCurrentOrbit();
    FIS.OrbitActivities.updateSamGreetingActivity(orbit.orbitId, userId, timestamp, distance);

    return OnlineStatusModel.update({userId: userId, connections: connectionId, $or: [{samGreetingsDist: null}, {samGreetingsDist: {$gte: distance}}]}, {
        $set: {
            lastActivity: timestamp,
            samGreetingsActivity: timestamp,
            samGreetingsDist: distance
        }
    });
}


function setOnlineActivity(userId, userType, connectionId, coordinates) {
    var timestamp = moment.utc().valueOf();
    var orbit = FIS.Orbits.getCurrentOrbit();
    var onOrbit = FIS.Math.isOnOrbit(orbit.orbit, coordinates);

    FIS.OrbitActivities.updateOrbitActivity(orbit.orbitId, orbit.start, userId, userType, onOrbit, coordinates, timestamp);

    var userProfile = Meteor.users.findOne({_id: userId});
    var profile = userProfile != null ? userProfile.profile : null;

    //register online activity
    return OnlineStatusModel.upsert({userId: userId}, {
        $addToSet: {connections: connectionId},
        $set: {
            online: true,
            profile: profile,
            coordinates: coordinates,
            lastActivity: timestamp,
            onOrbit: onOrbit,
            type: userType
        }
    });
}

function setOrbitPassageActivity() {
    var timestamp = moment.utc().valueOf();
    var orbit = FIS.Orbits.getCurrentOrbit();

    var usersOnline = OnlineStatusModel.find({}).fetch();

    for (var i = 0; i < usersOnline.length; i++) {
        var user = usersOnline[i];
        var onOrbit = FIS.Math.isOnOrbit(orbit.orbit, user.coordinates);

        FIS.OrbitActivities.updateOrbitActivity(orbit.orbitId, orbit.start, user.userId, user.type, onOrbit, user.coordinates, timestamp);

        var userProfile = Meteor.users.findOne({_id: user.userId});
        var profile = userProfile != null ? userProfile.profile : null;
        OnlineStatusModel.upsert({userId: user.userId}, {
            $set: {
                online: true,
                profile: profile,
                coordinates: user.coordinates,
                lastActivity: timestamp,
                onOrbit: onOrbit,
                type: user.type,
                samGreetingsDist: null,
                samGreetingsActivity: null,
                earthGreetingsActivity: null
            }
        });
    }
}


function setOfflineActivity(connectionId) {
    var existingActivity = OnlineStatusModel.findOne({connections: connectionId});
    if (!existingActivity) {
        return;
    }
    if (existingActivity.onOrbit && existingActivity.samGreetingsActivity) {
        var updateQuery ={
            $pull: {
                connections: connectionId
            },
            $set: { //set offline only if we have just 1 connection
                online: existingActivity.connections.length > 1
            }
        };
        OnlineStatusModel.update({_id: existingActivity._id}, updateQuery);
        return;
    }
    if (existingActivity.connections.length == 1) {
        return OnlineStatusModel.remove({_id: existingActivity._id});
    } else {
        OnlineStatusModel.update({_id: existingActivity._id}, {$pull: {connections: connectionId}});
    }
}

function clearOnlineStatus() {
    OnlineStatusModel.remove({});
}
function clearOnlineZombieStatus() {
    //clearing sam's greetings activities because of orbit change
    OnlineStatusModel.remove({online: false});
}


FIS.OnlineStatus = {
    model: OnlineStatusModel,

    setOnlineActivity: setOnlineActivity,
    setOfflineActivity: setOfflineActivity,
    clearOnlineStatus: clearOnlineStatus,
    clearOnlineZombieStatus: clearOnlineZombieStatus,
    setOrbitPassageActivity: setOrbitPassageActivity,

    saveEarthGreetings: saveEarthGreetings,
    saveSamGreetings: saveSamGreetings

};