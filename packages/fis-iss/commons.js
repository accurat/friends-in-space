OrbitsModel = new Mongo.Collection('fisOrbits');
CurrentOrbitModel = new Mongo.Collection('fisCurrentOrbit');
TwoLineElementsModel = new Mongo.Collection('fisTLE');


//security policies
if (Meteor.isServer) {

    OrbitsModel.timestampable();

    OrbitsModel.allow({
        insert: function () {
            return false;
        },
        remove: function () {
            return false;
        },
        update: function () {
            return false;
        }
    });
    CurrentOrbitModel.allow({
        insert: function () {
            return false;
        },
        remove: function () {
            return false;
        },
        update: function () {
            return false;
        }
    });

    Meteor.publish('fisCurrentOrbit', function () {
        return CurrentOrbitModel.find();
    });
    Meteor.publish('fisOrbits', function () {
        return OrbitsModel.find();
    });
    Meteor.publish('fisTLE', function () {
        return TwoLineElementsModel.find();
    });


    Meteor.methods({

        createFakeOrbit: function (timestamp) {
            console.log("FAKE NEW ORBIT");
            var timestamp = moment.utc(timestamp);
            var currentOrbit = FIS.Orbits.getCurrentOrbit();

            var tle = FIS.TLE.getTLEbyTimestamp(timestamp);
            //get the orbit values
            var orbit = FIS.ISS.getOrbit(tle, 1, 'm', timestamp);

            if (FIS.Orbits.addNewOrbit(currentOrbit.orbitId + 1, orbit, tle)) {
                console.log("ADD NEW ORBIT FAKE")
            } else {
                console.log("can't add new fake orbit");
            }

        },
        reinitOrbits: function () {
            FIS.Orbits.fillOrbits();

        }
    });

}