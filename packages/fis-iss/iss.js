//requires: Satellitejs

function getISSPosition(tle, timestamp, satrec, isMoment) {

    timestamp.startOf('second');

    if (!satrec)
        satrec = Satellitejs.twoline2satrec(tle.line1, tle.line2);

    var position = Satellitejs.propagate(satrec,
        timestamp.utc().year(),
        timestamp.utc().month() + 1, // Note, this function requires months in range 1-12.
        timestamp.utc().date(),
        timestamp.utc().hours(),
        timestamp.utc().minutes(),
        timestamp.utc().seconds())['position'];

    var gmst = Satellitejs.gstime_from_date(timestamp.utc().year(),
        timestamp.utc().month() + 1, // Note, this function requires months in range 1-12.
        timestamp.utc().date(),
        timestamp.utc().hours(),
        timestamp.utc().minutes(),
        timestamp.utc().seconds());

    var coordinates = Satellitejs.eci_to_geodetic(position, gmst);
    var longitude = Satellitejs.degrees_long(coordinates['longitude']);
    var latitude = Satellitejs.degrees_lat(coordinates['latitude']);
    var height = coordinates["height"];

    return {coordinates: [longitude, latitude], altitude: height, timestamp: isMoment ? moment(timestamp.utc()) : timestamp.utc().valueOf()};
}

function getOrbit(tle, step, stepUnit, requestTimestamp, isMoment) {

    var timestamp = moment(requestTimestamp).add(1,'m');


    var satrec = Satellitejs.twoline2satrec(tle.line1, tle.line2);
    timestamp.startOf('second');

    var prevLongitude = getISSPosition(null, timestamp, satrec).coordinates[0],
        nextLongitude = prevLongitude;

    while (!(prevLongitude < 0 && nextLongitude > 0)) {
        prevLongitude = nextLongitude;
        timestamp.subtract(1, 's');
        var nextLongitude = getISSPosition(null, timestamp, satrec).coordinates[0];
    }

    timestamp.add(1, 's');

    var orbit = {
        coordinates: [],
        timestamps: [],
        altitudes: []
    };

    var prevPosition = getISSPosition(null, timestamp, satrec, isMoment),
        nextPosition = prevPosition;

    while (!(prevPosition.coordinates[0] > 0 && nextPosition.coordinates[0] < 0)) {
        prevPosition = nextPosition;
        timestamp.add(step, stepUnit);
        nextPosition = getISSPosition(null, timestamp, satrec, isMoment);
        orbit.coordinates.push(prevPosition.coordinates);
        orbit.altitudes.push(prevPosition.altitude);
        orbit.timestamps.push(prevPosition.timestamp);
    }
    return orbit;
}



FIS.ISS = {
    getOrbit: getOrbit,
    getISSPosition: getISSPosition
};
