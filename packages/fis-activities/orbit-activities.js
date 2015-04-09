var logger = FIS.Log.getLogger('orbit-activities');


//--------------------------------------------
//---------- ORBIT ACTIVITY METHODS ---------
//--------------------------------------------


function updateOrbitActivity(orbitId, orbitStart, userId, userType, onOrbit, coordinates, timestamp) {


    //update user profile
    if (userType == FIS.USER_TYPE.USER) {

        var updateObject = {
            'profile.orbits': {
                orbitId: orbitId,
                start: orbitStart
            }
        };
        if (onOrbit) {
            updateObject['profile.onOrbit'] = {
                orbitId: orbitId,
                start: orbitStart
            };
        } else {
            updateObject['profile.inSpace'] = {
                orbitId: orbitId,
                start: orbitStart
            };
        }
        Meteor.users.update({_id: userId}, {$addToSet: updateObject});
    }

    //update orbit activities
    var response = OrbitActivitiesModel.upsert({orbitId: orbitId, userId: userId}, {
        $set: {
            coordinates: coordinates,
            onOrbit: onOrbit,
            lastActivity: timestamp,
            type: userType
        }
    });

    //send only the first time on this orbit for this user
    if (process.env.FIS_CARTODB_API_KEY != null &&response != null && response.insertedId) {
        var url = "http://friendsinspace.cartodb.com/api/v2/sql?q=INSERT INTO friends_in_space (the_geom,userid,orbitid) VALUES (ST_GeomFromText('POINT(";
        url += coordinates[0] + " " + coordinates[1];
        url += ")', 4326), '" + userId + "' , '" + orbitId + "'";
        url += ")&api_key=FIS_CARTODB_API_KEY";


        //run and forget... ;)
        HTTP.get(url, function (err, response) {
        });
    }
}
function updateEarthGreetingActivity(orbitId, userId, timestamp) {

    OrbitActivitiesModel.update({orbitId: orbitId, userId: userId}, {
        $set: {
            lastActivity: timestamp,
            earthGreetingsActivity: timestamp
        },
        $inc: {
            earthGreetings: 1
        }
    });
}
function updateSamGreetingActivity(orbitId, userId, timestamp, distance) {

    OrbitActivitiesModel.update({orbitId: orbitId, userId: userId, $or: [{samGreetingsDist: null}, {samGreetingsDist: {$gte: distance}}]}, {
        $set: {
            lastActivity: timestamp,
            samGreetingsActivity: timestamp,
            samGreetingsDist: distance
        },
        $inc: {
            samGreetings: 1
        }
    });
}
function updateLinkGreetingActivity(userId, userType, startUserId, endUserId, started) {
    var orbit = FIS.Orbits.getCurrentOrbit();

    var linkHash = orbit.orbitId + "#-#" + startUserId + "#-#" + endUserId + "#-#" + (started ? 1 : 0);

    var friend = startUserId == userId ? endUserId : startUserId;

    if(userType == 'user'){
        //update user profile
        Meteor.users.update({_id: userId}, {
            $addToSet: {
                'profile.links': linkHash,
                'profile.friends':friend
            }
        });
    }

    OrbitActivitiesModel.update({orbitId: orbit.orbitId, userId: userId}, {
        $addToSet: {
            greetingLinks: {
                startUserId: startUserId,
                endUserId: endUserId,
                started: started
            }
        }
    });
}


FIS.OrbitActivities = {
    model: OrbitActivitiesModel,
    updateOrbitActivity: updateOrbitActivity,
    updateEarthGreetingActivity: updateEarthGreetingActivity,
    updateSamGreetingActivity: updateSamGreetingActivity,
    updateLinkGreetingActivity: updateLinkGreetingActivity
};