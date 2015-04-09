//requires: FIS.Log

var logger = FIS.Log.getLogger('fis-tle');

var TLE_UPDATE_TIME = 10 * 60 * 1000;

var updateHandler;


function startAutoUpdate() {

    if (updateHandler != null) {
        Meteor.clearInterval(updateHandler);
    }


    //add safeguard TLE
    if (process.env.NODE_ROLE == 'master') {
        logger.debug('Adding SafeGuard TLE');
        var timestamp = new Date("2014-11-23T14:54:39.000Z").getTime();
        TwoLineElementsModel.upsert({start: timestamp}, {
            $set: {
                start: 1416754479000,
                line1: '1 25544U 98067A   14327.62128819  .00027616  00000-0  46569-3 0  4499',
                line2: '2 25544  51.6479  29.1490 0007009  60.3444  30.8455 15.51427777916069'
            }

        });
    }


    logger.info("TLE start auto update every %s sec", TLE_UPDATE_TIME / 1000);

    //check TLE at intervals
    updateHandler = Meteor.setInterval(function () {
        updateTLE(function (err, data) {
            if (err) {
                logger.error("Can't update TLE", err);
            } else {
                if (data != null) {
                    logger.debug("TLE updated", data);
                }
            }
        });
    }, TLE_UPDATE_TIME);
}

function stopAutoUpdate() {
    if (updateHandler != null) {
        Meteor.clearInterval(updateHandler);
        logger.info("TLE Manager stopped auto updater");
    }
}


function processTLE(line1, line2) {


    var satrec = Satellitejs.twoline2satrec(line1, line2);
    var year = satrec.epochyr;
    var epochDays = satrec.epochdays;
    var date = Satellitejs.days2mdhms(year, epochDays);

    var issDate = {
        year: year + 2000,
        month: date.mon - 1,
        day: date.day,
        hour: date.hr,
        minute: date.minute,
        second: Math.floor(date.sec),
        millisecond: Math.floor((date.sec - Math.floor(date.sec)) * 1000)
    };

    var tleTimestamp = moment.utc(issDate);

    var position = FIS.ISS.getISSPosition({line1: line1, line2: line2}, tleTimestamp).coordinates[0];
    if (_.isNaN(position)) {
        logger.error("Wrong TLE:", line1, line2);
        return null;
    } else {
        var result = TwoLineElementsModel.upsert({start: tleTimestamp.valueOf()}, {$set: {line1: line1, line2: line2}});
        if (result.insertedId) {
            logger.info("NEW TLE ADDED at: ", result, line1, line2);
            return result;
        }
        return null;
    }


}

function processContent(content) {

    var lines = content.split(/\r*\n/);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('ISS (ZARYA)') == 0) {
            var line1 = lines[i + 1],
                line2 = lines[i + 2];
            return processTLE(line1, line2);
        }
    }
    return null;
}

function updateTLE(callback) {

    HTTP.get("http://www.celestrak.com/NORAD/elements/stations.txt", function (error, result) {

        if (error) {
            callback(error);
        } else {
            if (result.statusCode === 200) {
                callback(null, processContent(result.content))
            } else {
                callback("Error with status code:" + result.statusCode);
            }
        }
    });

}


function getTLEbyTimestamp(timestamp) {
    return TwoLineElementsModel.findOne({start: {$lte: (moment.utc(timestamp).valueOf())}}, {sort: {start: -1}});
}


function getLastTLE() {
    return TwoLineElementsModel.findOne({}, {sort: {start: -1}});
}


function addTLE(line1, line2) {
    return processTLE(line1, line2)
}


FIS.TLE = {
    model: TwoLineElementsModel,
    startAutoUpdate: startAutoUpdate,
    stopAutoUpdate: stopAutoUpdate,
    getLastTLE: getLastTLE,
    getTLEbyTimestamp: getTLEbyTimestamp
};