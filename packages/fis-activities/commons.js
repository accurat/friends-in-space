OnlineStatusModel = new Mongo.Collection('fisOnlineStatus');
OrbitActivitiesModel = new Mongo.Collection('fisOrbitActivities');


//security policies
if (Meteor.isServer) {
    OnlineStatusModel.allow({
        insert: function () {
            return false;
        },
        update: function () {
            return false;
        },
        remove: function () {
            return false;
        }
    });

    OrbitActivitiesModel.allow({
        insert: function () {
            return false;
        },
        update: function () {
            return false;
        },
        remove: function () {
            return false;
        }
    });

    //TODO REMOVE IF NOT NECESSARY
    Meteor.publish('fisOnlineStatus', function () {
        return OnlineStatusModel.find();
    });
    Meteor.publish('fisOrbitActivities', function () {
        if (this.userId) {
            return OrbitActivitiesModel.find();
        } else {
            return [];
        }

    });

    Meteor.methods({
        getActivitiesPerOrbit: function (start, end) {
            var orbit = OrbitsModel.findOne({start:{$gte:(start-1000*60*10)}, end:{$lte:(end+1000*60*10)}});
            if (orbit != null) {
                var orbitData = OrbitActivitiesModel.find({orbitId: orbit.orbitId}).fetch();
                return orbitData;
            } else {
                console.error("Can't find orbit between %s and %s", start, end);
                return [];
            }
        }
    })

}