//requires: FIS.Log, FIS.ISS, FIS.TLE

var logger = FIS.Log.getLogger('fis-orbits');


//--------------------------------------------
//---------- ORBIT METHODS ---------
//--------------------------------------------

var ISS_UPDATE_TIME = 5 * 1000;
var ISS_DAY_ZERO = moment.utc('2014-11-24 03:00');


//get last orbit
function getCurrentOrbit() {
    return OrbitsModel.findOne({}, {sort: {orbitId: -1}});
}


/**
 * Fills the orbits from the first one to the current one.
 */
function fillOrbits() {

    OrbitsModel.remove({});
    //start from day zero
    var timestamp = moment(ISS_DAY_ZERO);
    var now = moment.utc();

    //orbitId start from 0

    var orbitId = 0;

    while (timestamp.isBefore(now)) {
        console.log("\n\n\n\n\n--------------");
        console.log("Getting orbit starting from ",timestamp.format()," "+timestamp.valueOf());
        //get the righ TLE for the timestamp used
        var tle = FIS.TLE.getTLEbyTimestamp(timestamp);
        console.log("using TLE", tle._id);
        //get the orbit values
        var orbit = FIS.ISS.getOrbit(tle, 1, 'm', timestamp);
        console.log("ORBIT LAST TIMESTAMP: ",moment.utc(orbit.timestamps[orbit.timestamps.length-1]).format());
        if (addNewOrbit(orbitId, orbit, tle)) {
            orbitId++;
        }else{
            console.log("can't add an orbit");
        }
        timestamp = moment.utc(orbit.timestamps[orbit.timestamps.length-1]);
        console.log("--------------");
    }
    logger.debug("Recreated %s orbits", OrbitsModel.find().count());

}


//add new orbit
function addNewOrbit(orbitId, orbit, tle) {


    var start = orbit.timestamps[0];
    var end = orbit.timestamps[orbit.timestamps.length - 1];
    //find if exist at least one orbit that ends after this start
    var existingOrbit = OrbitsModel.findOne({end: {$gt: (start+1000*60*10)}});
    if (existingOrbit) {
        logger.error('Orbit %s in [%s, %s] already exist existing orbit ends at: %s orbitId: %s', orbitId, start, end, existingOrbit.end, existingOrbit.orbitId);
        return false;
    }

    var startOrbitLon = orbit.coordinates[0][0];
    var endOrbitLon = orbit.coordinates[orbit.coordinates.length - 1][0];
    CurrentOrbitModel.upsert({current: true}, {
        $set: {
            current: true,
            orbitId: orbitId,
            start: start,
            end: end,
            tle: {
                line1: tle.line1,
                line2: tle.line2
            }
        }
    });
    OrbitsModel.insert({orbitId: orbitId, start: start, end: end, orbit: orbit});
    return true;
}


var orbitUpdateHandler;

/**
 * The MASTER SERVER will start the auto orbit updaters that:
 * - update the db when the ISS cross +180 degrees
 * - remove from online status collection all "zombies greeters"
 * - set the orbit passage
 */
function startAutoUpdate() {

    //recalculate existing orbits

    if (process.env.NODE_ROLE == 'master') {
        logger.info('Cleaning and filling orbits');
        fillOrbits();
    }


    if (orbitUpdateHandler != null) {
        Meteor.clearInterval(orbitUpdateHandler);
    }
    logger.info("Orbit start auto update every %s sec", ISS_UPDATE_TIME / 1000);

    var lastIssPosition = null;
    var lastTLE = FIS.TLE.getLastTLE();


    orbitUpdateHandler = Meteor.setInterval(function () {


        var currentTimestamp = moment.utc();

        var currentPosition = FIS.ISS.getISSPosition(lastTLE, currentTimestamp);
        if(!_.isNumber(currentPosition.coordinates[0])){
            console.log("NOT A NUMBER");
        }
        if (lastIssPosition == null) {
            lastIssPosition = currentPosition;
        } else {
            if (lastIssPosition.coordinates[0] > 0 && currentPosition.coordinates[0] < 0) {
                var orbitPath = FIS.ISS.getOrbit(lastTLE, 1, 'm', currentTimestamp);
                var prevOrbit = OrbitsModel.findOne({}, {sort: {orbitId: -1}, fields: {orbitId: 1}});
                var newOrbitIt = prevOrbit.orbitId + 1;
                //add a new orbit and propagate the new orbit path
                addNewOrbit(newOrbitIt, orbitPath, lastTLE);

                logger.info("New ORBIT %s created", newOrbitIt);
                FIS.OnlineStatus.clearOnlineZombieStatus();
                FIS.OnlineStatus.setOrbitPassageActivity();
                lastTLE = FIS.TLE.getLastTLE();
            }
            lastIssPosition = currentPosition;
        }
        logger.verbose("pos: %s at %s %s", currentTimestamp.toISOString(), currentPosition.coordinates, currentPosition.altitude);


    }, ISS_UPDATE_TIME);


}
function stopAutoUpdate() {
    if (orbitUpdateHandler != null) {
        Meteor.clearInterval(orbitUpdateHandler);
    }
}


FIS.Orbits = {
    model: OrbitsModel,
    currentOrbitModel: CurrentOrbitModel,
    startAutoUpdate: startAutoUpdate,
    stopAutoUpdate: stopAutoUpdate,
    addNewOrbit: addNewOrbit,
    getCurrentOrbit: getCurrentOrbit,
    fillOrbits: fillOrbits
};