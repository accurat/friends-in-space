//var ORBIT_DETAIL = 750;
//var ORBIT_STEP = 90 / ORBIT_DETAIL;
//var ORBIT_STEP_UNIT = 'm';
//
//function IssPosition() {
//    this.satellite = satellite();
//}
//
//IssPosition.prototype.getIssPosition = function (tle, timestamp, satrec) {
//
//    if (!satrec) {
//        satrec = this.satellite.twoline2satrec(tle.line1, tle.line2);
//    }
//
//    // if no arguments, than use now()
//    if (timestamp == undefined || timestamp == null) timestamp = moment.utc();
//
//    var position = this.satellite.propagate(satrec,
//        timestamp.utc().year(),
//        timestamp.utc().month() + 1, // Note, this function requires months in range 1-12.
//        timestamp.utc().date(),
//        timestamp.utc().hours(),
//        timestamp.utc().minutes(),
//        timestamp.utc().seconds())['position'];
//
//    var gmst = this.satellite.gstime_from_date(timestamp.utc().year(),
//        timestamp.utc().month() + 1, // Note, this function requires months in range 1-12.
//        timestamp.utc().date(),
//        timestamp.utc().hours(),
//        timestamp.utc().minutes(),
//        timestamp.utc().seconds());
//
//    var coordinates = this.satellite.eci_to_geodetic(position, gmst);
//    var longitude = this.satellite.degrees_long(coordinates['longitude']);
//    var latitude = this.satellite.degrees_lat(coordinates['latitude']);
//
//    return [longitude, latitude];
//};
//
//
//// returns the ISS complete orbit positions array to which the provided timestamp belongs
//IssPosition.prototype.getOrbitPositions = function (tle, timestamp, satrec) {
//
//    var satrec = this.satellite.twoline2satrec(tle.line1, tle.line2);
//
//    var prevLongitude = this.getIssPosition(tle, timestamp, satrec)[0],
//        nextLongitude = prevLongitude;
//
//    while (!(prevLongitude < 0 && nextLongitude > 0)) {
//        prevLongitude = nextLongitude;
//        timestamp.subtract(ORBIT_STEP, ORBIT_STEP_UNIT);
//        var nextLongitude = this.getIssPosition(null, timestamp, satrec)[0];
//    }
//
//    timestamp.add(ORBIT_STEP, ORBIT_STEP_UNIT);
//
//    var positions = [];
//    var timestamps = [];
//
//    var prevPosition = this.getIssPosition(null, timestamp, satrec),
//        nextPosition = prevPosition;
//
//    while (!(prevPosition[0] > 0 && nextPosition[0] < 0)) {
//        prevPosition = nextPosition;
//        timestamp.add(ORBIT_STEP, ORBIT_STEP_UNIT);
//        nextPosition = this.getIssPosition(null, timestamp, satrec);
//        positions.push(prevPosition);
//        timestamps.push(timestamp.clone());
//    }
//
//    return {
//        'positions' : positions,
//        'timestamps': timestamps
//    };
//};
