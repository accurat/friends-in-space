

var ORBITS_PER_DAY = 16;
var TLE_WEEKS_SPAN = 1;
var DAYS_PER_WEEK = 7;

// ================================================================================
// CONSTRUCTOR
// ================================================================================
IssOrbit = function() {

    this.tleCache = {};

};

// ================================================================================
// METHODS
// ================================================================================

// retrieves the orbit tle data
IssOrbit.prototype.retrieveOrbitTle = function (orbitId, referenceTimestamp) {

    var tleIndex; // index for tle cache; similar but NOT equal to orbit ids!

    if (orbitId >= 0) {
        // each orbit after the current is approximated with the current tle
        tleIndex = 0;
    } else {
        // for past orbits, compute which tleIndex should be referred to
        var tleValidity = ORBITS_PER_DAY * TLE_WEEKS_SPAN * DAYS_PER_WEEK; // number of orbits covered by one tle
        tleIndex = Math.floor(orbitId / tleValidity) + 1;
    }

    var tle = this.tleCache[tleIndex];
    if (!tle) {

        // TODO: attach to the correct server method to retrieve tle data packet
        // referenceTimestamp is a timestamp belonging to the required orbit
        // tle = server.getTle(referenceTimestamp);

        tle = {
            line1: "1 25544U 98067A   14286.26529391  .00013904  00000-0  24756-3 0  2366",
            line2: "2 25544  51.6465 234.2873 0002556 250.3191 268.7827 15.50411839909642"
        };

        this.tleCache[tleIndex] = tle;
    }

    return tle;
};

/**
 * returns the current ISS position wrt the provided orbit (which must be the current one!)
 * @param currentOrbit
 * @returns {number|32}
 */
IssOrbit.prototype.getCurrentIndexInOrbit = function (currentOrbit) {
    var now = moment.utc();
    return this.getIndexInOrbit(now, currentOrbit);
};

/**
 * returns the position index in the provided orbit corresponding to the provided timestamp
 * @param timestamp
 * @param orbit
 * @returns {number}
 */
IssOrbit.prototype.getIndexInOrbit = function (timestamp, orbit) {
    // check if the provided timestamp is comprised in the provided orbit
    if (timestamp.isBefore(orbit.timestampStart) || timestamp.isAfter(orbit.timestampEnd)) return -1;
    // look for the current position
    for (var i = orbit.timestamps.length - 1; i >= 0; i--) {
        if (orbit.timestamps[i].isBefore(timestamp)) return i;
    }
    return -1;
};

/**
 * returns an array of adjusted position coordinates wrt the provided orbitId
 * @param orbitId
 * @param orbitCoordinates
 * @returns {Array}
 */
IssOrbit.prototype.adjustOrbitCoordinates = function (orbitId, orbitCoordinates) {

    var actualCoordinates = [];
    for (var i = 0; i < orbitCoordinates.length; i++) {
        var adjustedLongitude = orbitCoordinates[i][0] + orbitId * 360;
        actualCoordinates.push([adjustedLongitude, orbitCoordinates[i][1]]);
    }

    return actualCoordinates;
};

IssOrbit.prototype.estimateOrbitPosition = function (positionDirection, orbit) {

    var multiplier = 1;

    if (positionDirection == IssOrbit.POSITION_NEXT) {
        var x = orbit.coordinates[orbit.coordinates.length - 1][0] + multiplier * (orbit.coordinates[orbit.coordinates.length - 1][0] - orbit.coordinates[orbit.coordinates.length - 2][0]);
        var y = orbit.coordinates[orbit.coordinates.length - 1][1] + multiplier * (orbit.coordinates[orbit.coordinates.length - 1][1] - orbit.coordinates[orbit.coordinates.length - 2][1]);
        return [x, y];
    } else if (positionDirection == IssOrbit.POSITION_PREV) {
        var x = orbit.coordinates[0][0] - multiplier * (orbit.coordinates[1][0] - orbit.coordinates[0][0]);
        var y = orbit.coordinates[0][1] - multiplier * (orbit.coordinates[1][1] - orbit.coordinates[0][1]);
        return [x, y];
    } else {
        return [0, 0];
    }

};


/**
 * builds an Orbit object to be used by IssTracker
 * @param orbitId
 * @param orbitData
 * @param dataUpdateCallback
 * @returns {{id: *, timestampStart: *, timestampEnd: *, coordinates: (Array|44), timestamps: (*|orbit.timestamps), markers: Array, eventsInterval: Array, eventsSpot: Array}}
 */
IssOrbit.prototype.buildOrbit = function (orbitId, orbitData, dataUpdateCallback) {

    var adjustedCoordinates = this.adjustOrbitCoordinates(orbitId, orbitData.coordinates);

    var orbit = {
        id: orbitId,
        timestampStart: orbitData.timestamps[0],
        timestampEnd: orbitData.timestamps[orbitData.timestamps.length - 1],
        coordinates: adjustedCoordinates,
        //originalCoordinates : orbitData.coordinates,
        timestamps: orbitData.timestamps,
        markers: [],
        eventsInterval: [],
        eventsSpot: []
    };

    this.retrieveOrbitData(IssOrbit.DATA_MARKERS, orbit, dataUpdateCallback);
    this.retrieveOrbitData(IssOrbit.DATA_EVENTS_INTERVAL, orbit, dataUpdateCallback);
    this.retrieveOrbitData(IssOrbit.DATA_EVENTS_SPOT, orbit, dataUpdateCallback);

    return orbit;
};


// returns an Orbit object to be used by IssTracker
IssOrbit.prototype.getOrbit = function (type, referenceOrbit, referenceTimestamp, dataUpdateCallback) {

    if (!type) throw new Error('missing type parameter');

    var orbit = null;
    var deltaTimestampValue = 5;
    var deltaTimestampUnit = 'm';

    if (type == IssOrbit.ORBIT_CURRENT) {

        var orbitId = 0;
        var time = moment.utc();

        var tle = this.retrieveOrbitTle(orbitId, time);
        var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', time, true);

        orbit = this.buildOrbit(orbitId, orbitCoords, dataUpdateCallback);

    } else if (type == IssOrbit.ORBIT_NEXT) {

        if (!referenceOrbit) throw new Error('missing referenceOrbit parameter');
        var orbitId = referenceOrbit.id + 1;
        var time = referenceOrbit.timestampEnd.clone();
        time = time.add(deltaTimestampValue, deltaTimestampUnit);

        var tle = this.retrieveOrbitTle(orbitId, time);
        var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', time, true);

        orbit = this.buildOrbit(orbitId, orbitCoords, dataUpdateCallback);

    } else if (type == IssOrbit.ORBIT_PREV) {

        if (!referenceOrbit) throw new Error('missing referenceOrbit parameter');
        var orbitId = referenceOrbit.id - 1;
        var time = referenceOrbit.timestampStart.clone();
        time = time.subtract(deltaTimestampValue, deltaTimestampUnit);

        var tle = this.retrieveOrbitTle(orbitId, time);
        var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', time, true);

        orbit = this.buildOrbit(orbitId, orbitCoords, dataUpdateCallback);

    } else if (type == IssOrbit.ORBIT_OF_TIMESTAMP) {

        if (!referenceTimestamp) throw new Error('missing referenceTimestamp parameter');

        var now = moment.utc();
        if (referenceTimestamp.isBefore(now)) {

            // timestamp < now, go back in time until an orbit containing timestamp is found
            var found = false;
            var tle = this.retrieveOrbitTle(0, now);
            var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', referenceTimestamp, true);
            var orbit = this.buildOrbit(0, orbitCoords, dataUpdateCallback);

            while (!found) {
                if (orbit.timestampStart.isBefore(referenceTimestamp) || orbit.timestampStart.isSame(referenceTimestamp)) {
                    found = true;
                } else {
                    orbit = this.getOrbit(IssOrbit.ORBIT_PREV, orbit, null);
                }
            }

        } else if (referenceTimestamp.isAfter(now)) {

            // timestamp > now, go ahead in time until an orbit containing timestamp is found
            var found = false;
            var tle = this.retrieveOrbitTle(0, now);
            var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', referenceTimestamp, true);
            var orbit = this.buildOrbit(0, orbitCoords, dataUpdateCallback);

            while (!found) {
                if (orbit.timestampEnd.isAfter(referenceTimestamp) || orbit.timestampEnd.isSame(referenceTimestamp)) {
                    found = true;
                } else {
                    orbit = this.getOrbit(IssOrbit.ORBIT_NEXT, orbit, null);
                }
            }

        } else {
            var tle = this.retrieveOrbitTle(0, referenceTimestamp);
            var orbitCoords = FIS.ISS.getOrbit(tle, 10, 's', referenceTimestamp, true);
            // timestamp == now, do this instead of calling getOrbit(ORBIT_CURRENT) to preserve consistency with referenceTimestamp
            orbit = this.buildOrbit(0, orbitCoords, dataUpdateCallback);
        }
    }

    return orbit;
};

/**
 * retrieves the correct orbit data set from the remote server and invokes the data update callback when finished
 * @param dataType
 * @param orbit
 * @param dataUpdateCallback
 */
IssOrbit.prototype.retrieveOrbitData = function (dataType, orbit, dataUpdateCallback) {
    var self = this;
    if (dataType == IssOrbit.DATA_MARKERS) {
        self.retrieveOrbitMarkers(orbit, dataUpdateCallback);
    } else if (dataType == IssOrbit.DATA_EVENTS_INTERVAL) {
        setTimeout(function () {
            self.retrieveOrbitEventsInterval(orbit, dataUpdateCallback);
        }, 1000);
    } else if (dataType == IssOrbit.DATA_EVENTS_SPOT) {
        setTimeout(function () {
            self.retrieveOrbitEventsSpot(orbit, dataUpdateCallback);
        }, 1000);
    }
};

// retrieves and updates the markers data packet for the provided orbit
IssOrbit.prototype.retrieveOrbitMarkers = function (orbit, dataUpdateCallback) {

    //OrbitActivitiesModel.find({orbitId: orbit.id}).fetch();

    /* MODELLO MARKER:
     orbitId : <orbit_id>,
     onOrbit : true/false,
     greetings : n,
     userId : <user_id>,
     userName : <user_name>,
     userLocation : [lat, lon],
     type : 'guest'|'user',
     lastActivity : timestamp,
     connectedPeople : n,
     orbitsWithSam : n,
     userImageURL : <image_url>
     */
    var names = ['@francesco', '@marco', '@simone', '@davide', '@gabriele', '@giorgia', '@alex', '@giovanni', '@stefania', '@marwa', '@tommaso'];
    var locations = ['Milano', 'New York', 'Biella', 'Pescara', 'Pesaro', 'Umbertide'];
    Meteor.call('getActivitiesPerOrbit',orbit.timestampStart.valueOf(),orbit.timestampEnd.valueOf(), function(err,orbitData){

        var markerCollection = [];

        for(var i = 0; i < orbitData.length; i++){
            var data = orbitData[i];

            var longitude = data.coordinates[0] + (360 * orbit.id);
            var latitude = data.coordinates[1];
            var coordinates = [longitude, latitude];

            var marker = new ol.Feature({'geometry': new ol.geom.Point(ol.proj.transform(coordinates, IssTracker.MAP_LATLON, IssTracker.MAP_METRIC))});

            marker.orbitId = orbit.id;
            marker.onOrbit = data.onOrbit;
            marker.greetings = 1;
            //marker.greetings = data.greetingLinks ? data.greetingLinks.length: 0;
            marker.userId = data.userId;
            marker.userName = names[Math.floor(Math.random() * names.length)];
            marker.userLocation = locations[Math.floor(Math.random() * locations.length)];
            marker.type = data.type;

            markerCollection.push(marker);
        }
        dataUpdateCallback(IssOrbit.DATA_MARKERS, orbit.id, markerCollection);

    });



    //
    //var count = 100 + orbit.id;
    //var names = ['@francesco', '@marco', '@simone', '@davide', '@gabriele', '@giorgia', '@alex', '@giovanni', '@stefania', '@marwa', '@tommaso'];
    //var locations = ['Milano', 'New York', 'Biella', 'Pescara', 'Pesaro', 'Umbertide'];
    //
    //var markerCollection = [];
    //for (var i = 0; i < count; ++i) {
    //
    //    var longitude = Math.floor(Math.random() * 360) - 180 + (360 * orbit.id);
    //    var latitude = Math.floor(Math.random() * 180) - 90;
    //    var coordinates = [longitude, latitude];
    //
    //    var marker = new ol.Feature({'geometry': new ol.geom.Point(ol.proj.transform(coordinates, IssTracker.MAP_LATLON, IssTracker.MAP_METRIC))});
    //
    //    marker.orbitId = orbit.id;
    //    marker.onOrbit = (Math.random() > 0.5) ? true : false;
    //    marker.greetings = Math.floor(Math.random() * 50);
    //    marker.userId = 'user' + Math.floor(Math.random() * 10000);
    //    marker.userName = names[Math.floor(Math.random() * names.length)];
    //    marker.userLocation = locations[Math.floor(Math.random() * locations.length)];
    //    marker.type = (Math.random() > 0.5) ? 'guest' : 'user';
    //    marker.lastActivity = (new Date()).getTime();
    //    marker.connectedPeople = Math.floor(Math.random() * 100);
    //    marker.orbitsWithSam = Math.floor(Math.random() * 20);
    //    marker.userImageURL = '';
    //
    //    markerCollection.push(marker);
    //}
    //
    //dataUpdateCallback(IssOrbit.DATA_MARKERS, orbit.id, markerCollection);
};

// retrieves and updates the interval events data packet for the provided orbit
IssOrbit.prototype.retrieveOrbitEventsInterval = function (orbit, dataUpdateCallback) {

    /* EVENT OBJECT MODEL:
     orbitId : <orbit_id>,
     personId : <person_id>,
     personName : <name>,
     id : <activity_id>,
     label : <label>,
     start : timestamp,
     end : timestamp,
     color : <#color>,
     category : <category>,
     description : <description>,
     media : [
     {
     type : <video | image | ...>,
     link : <media_url>
     }
     ]

     */

    // --------------------------------------------------------------------
    // code to handle event data from the server
    // --------------------------------------------------------------------
    // TODO: push in eventData raw data received from server
    var eventData = [];
    var eventCollection = [];

    for (var i = 0; i < eventData.length; i++) {

        var e = eventData[i];
        // assume event timestamps are provided as millis
        var eStart = moment(e.start);
        var eEnd = moment(e.end);

        if (!eStart.isAfter(orbit.timestampEnd) && !eEnd.isBefore(orbit.timestampStart)) {
            // event is related to current orbit
            // event.start <= orbit.end
            // event.end >= orbit.start

            // compute event start/end timings properly
            var eventStart = (eStart.isSame(orbit.timestampStart) || eStart.isAfter(orbit.timestampStart)) ? eStart : orbit.timestampStart.clone();
            var eventEnd = (eEnd.isSame(orbit.timestampEnd) || eEnd.isBefore(orbit.timestampEnd)) ? eEnd : orbit.timestampEnd.clone();

            // compute event coordinates array
            var eventCoordinates = this.getEventIntervalCoordinates(eventStart, eventEnd, orbit);

            // adjust coordinates array if boundaries are coincident
            // this is to avoid gaps between events on orbits boundaries
            if (eventStart.isSame(orbit.timestampStart)) eventCoordinates.splice(0, 1, this.estimateOrbitPosition(IssOrbit.POSITION_PREV, orbit));
            if (eventEnd.isSame(orbit.timestampEnd)) eventCoordinates.push(this.estimateOrbitPosition(IssOrbit.POSITION_NEXT, orbit));

            // create event object
            var event = new ol.Feature({
                'geometry': (new ol.geom.LineString(eventCoordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)
            });

            event.orbitId = orbit.id;
            event.personName = e.personName;
            event.id = e.id;
            event.label = e.label;
            event.start = eventStart;
            event.end = eventEnd;
            event.color = e.color;
            event.category = e.category;
            event.description = e.description;
            event.media = e.media;

            eventCollection.push(event);
        }
    }
    // --------------------------------------------------------------------


    // --------------------------------------------------------------------
    // code to generate fake events
    // --------------------------------------------------------------------
    var count = 10;
    var names = ['Francesco Merlo', 'Marco Vettorello', 'Simone Quadri', 'Davide Ciuffi', 'Gabriele Rossi', 'Giorgia Lupi', 'Alex Piacentini', 'Giovanni Marchi', 'Stefania Guerra', 'Marwa Boukarim', 'Tommaso Renzini'];
    var colors = ['#C0C0C0', '#FFFF00', '#8791CC', '#54d06c', '#f25b5b'];
    // --------------------------------------------------------------------
    // generate one event spanning the complete orbit
    // --------------------------------------------------------------------
    /*var eventCoordinates = this.getEventIntervalCoordinates(orbit.timestampStart, orbit.timestampEnd, orbit);
     eventCoordinates.splice(0, 1, this.estimateOrbitPosition(IssOrbit.POSITION_PREV, orbit));
     eventCoordinates.push(this.estimateOrbitPosition(IssOrbit.POSITION_NEXT, orbit));
     var event = new ol.Feature({'geometry': (new ol.geom.LineString(eventCoordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)});
     event.orbitId = orbit.id;
     event.personName = names[Math.floor(Math.random() * names.length)];
     event.id = 1;
     event.label = 'Event Label';
     event.start = orbit.timestampStart;
     event.end = orbit.timestampEnd;
     event.color = '#f25b5b'; //colors[Math.floor(Math.random() * colors.length)];
     event.category = 'Event Category';
     event.description = 'Nam tincidunt, ex ut sollicitudin luctus, nunc odio varius massa, sit amet hendrerit lorem augue at magna. Vivamus ultrices pretium sem non lacinia. Proin nec est eget tortor feugiat blandit. Cras nisi felis, accumsan non justo a, hendrerit consectetur lacus. Quisque euismod purus sed iaculis laoreet. Morbi vel tempus nunc.'
     event.media = [];
     eventCollection.push(event);*/
    // --------------------------------------------------------------------
    // generate a collection of 'count' random events
    // --------------------------------------------------------------------
    //for (var i = 0; i < count; i++) {
    //    var eventStartTime = orbit.timestampStart.clone();
    //    eventStartTime.add(Math.floor(Math.random() * 80), 'm');
    //    var eventEndTime = eventStartTime.clone();
    //    eventEndTime.add(Math.floor(Math.random() * 20), 'm');
    //    if (eventEndTime.isAfter(orbit.timestampEnd)) eventEndTime = orbit.timestampEnd.clone();
    //    var eventCoordinates = this.getEventIntervalCoordinates(eventStartTime, eventEndTime, orbit);
    //    var event = new ol.Feature({'geometry': (new ol.geom.LineString(eventCoordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)});
    //    event.orbitId = orbit.id;
    //    event.personName = names[Math.floor(Math.random() * names.length)];
    //    event.id = i;
    //    event.label = 'Event Label';
    //    event.start = eventStartTime;
    //    event.end = eventEndTime;
    //    event.color = colors[Math.floor(Math.random() * colors.length)];
    //    event.category = 'Event Category';
    //    event.description = 'Nam tincidunt, ex ut sollicitudin luctus, nunc odio varius massa, sit amet hendrerit lorem augue at magna. Vivamus ultrices pretium sem non lacinia. Proin nec est eget tortor feugiat blandit. Cras nisi felis, accumsan non justo a, hendrerit consectetur lacus. Quisque euismod purus sed iaculis laoreet. Morbi vel tempus nunc.'
    //    event.media = [];
    //    eventCollection.push(event);
    //}
    // --------------------------------------------------------------------


    // --------------------------------------------------------------------
    // callback invocation to update events data into parent orbit object
    dataUpdateCallback(IssOrbit.DATA_EVENTS_INTERVAL, orbit.id, eventCollection);
};

// retrieves and updates the spot events data packet for the provided orbit
IssOrbit.prototype.retrieveOrbitEventsSpot = function (orbit, dataUpdateCallback) {

    /* EVENT OBJECT MODEL:
     orbitId : <orbit_id>,
     personId : <person_id>,
     personName : <name>,
     id : <activity_id>,
     label : <label>,
     time : timestamp,
     color : <#color>,
     category : <category>,
     description : <description>,
     media : [
     {
     type : <video | image | ...>,
     link : <media_url>
     }
     ]

     */

    // --------------------------------------------------------------------
    // code to handle event data from the server
    // --------------------------------------------------------------------
    // TODO: push in eventData raw data received from server
    var eventData = [];
    var eventCollection = [];

    for (var i = 0; i < eventData.length; i++) {

        var e = eventData[i];
        // assume event timestamps are provided as millis
        var eTime = moment(e.start);

        if (!eTime.isAfter(orbit.timestampEnd) && !eTime.isBefore(orbit.timestampStart)) {
            // event is related to current orbit
            // event.time <= orbit.end
            // event.time >= orbit.start

            // compute event coordinates array
            var eventPosition = this.getTimestampPosition(eTime, orbit.coordinates);

            // create event object
            var coordinates = ol.proj.transform([orbit.coordinates[eventPos][0], orbit.coordinates[eventPos][1]], IssTracker.MAP_LATLON, IssTracker.MAP_METRIC);
            var event = new ol.Feature({'geometry': new ol.geom.Point(coordinates)});

            event.orbitId = orbit.id;
            event.personName = e.personName;
            event.id = e.id;
            event.label = e.label;
            event.time = eventTime;
            event.color = e.color;
            event.category = e.category;
            event.description = e.description;
            event.media = e.media;

            eventCollection.push(event);
        }
    }
    // --------------------------------------------------------------------

    // --------------------------------------------------------------------
    // code to generate fake events
    // --------------------------------------------------------------------
    //var count = 10;
    //var names = ['@francesco', '@marco', '@simone', '@davide', '@gabriele', '@giorgia', '@alex', '@giovanni', '@stefania', '@marwa', '@tommaso'];
    //var colors = ['#C0C0C0', '#FFFF00', '#8791CC', '#54d06c', '#f25b5b'];
    //for (var i = 0; i < count; i++) {
    //    var eventTime = orbit.timestampStart.clone();
    //    eventTime.add(Math.floor(Math.random() * 80), 'm');
    //    var eventPos = this.getTimestampPosition(eventTime, orbit.timestamps);
    //    var coordinates = ol.proj.transform([orbit.coordinates[eventPos][0], orbit.coordinates[eventPos][1]], IssTracker.MAP_LATLON, IssTracker.MAP_METRIC);
    //    var event = new ol.Feature({'geometry': new ol.geom.Point(coordinates)});
    //    event.orbitId = orbit.id;
    //    event.personName = names[Math.floor(Math.random() * names.length)];
    //    event.id = i;
    //    event.label = 'Event Label';
    //    event.time = eventTime;
    //    event.color = colors[Math.floor(Math.random() * colors.length)];
    //    event.category = 'Event Category';
    //    event.description = 'Nam tincidunt, ex ut sollicitudin luctus, nunc odio varius massa, sit amet hendrerit lorem augue at magna. Vivamus ultrices pretium sem non lacinia. Proin nec est eget tortor feugiat blandit. Cras nisi felis, accumsan non justo a, hendrerit consectetur lacus. Quisque euismod purus sed iaculis laoreet. Morbi vel tempus nunc.'
    //    event.media = [];
    //    eventCollection.push(event);
    //}

    // --------------------------------------------------------------------
    // callback invocation to update events data into parent orbit object
    dataUpdateCallback(IssOrbit.DATA_EVENTS_SPOT, orbit.id, eventCollection);
};

// ================================================================================
// UTILS
// ================================================================================

// returns the orbit position corresponding to the first timestamp before the specified timestamp
IssOrbit.prototype.getTimestampPosition = function (timestamp, orbitTimestamps) {

    // check boundaries
    if (timestamp.isBefore(orbitTimestamps[0])) return 0;
    if (timestamp.isAfter(orbitTimestamps[orbitTimestamps.length - 1])) return orbitTimestamps.length - 1;

    // timestamp is in orbit
    var position = -1;

    for (var i = 0; i < orbitTimestamps.length; i++) {

        var distance = timestamp.valueOf() - orbitTimestamps[i].valueOf();

        if (distance < 0) {
            position = i - 1;
            break;
        } else if (distance == 0) {
            position = i;
            break;
        } else {
            position = i;
        }
    }

    return position;
};

// returns an array of coordinates extracted from the provided orbit comprised between the two provided timestamps
IssOrbit.prototype.getEventIntervalCoordinates = function (startTime, endTime, orbit) {

    var startPos = this.getTimestampPosition(startTime, orbit.timestamps);
    var endPos = this.getTimestampPosition(endTime, orbit.timestamps);

    var eventCoordinates = [];
    if (startPos <= endPos) {
        for (var i = startPos; i < endPos; i++) {
            eventCoordinates.push([orbit.coordinates[i][0], orbit.coordinates[i][1]]);
        }
    }

    return eventCoordinates;
};


// ================================================================================
// CONSTANTS
// ================================================================================
IssOrbit.ORBIT_CURRENT = 'current';
IssOrbit.ORBIT_NEXT = 'next';
IssOrbit.ORBIT_PREV = 'prev';
IssOrbit.ORBIT_OF_TIMESTAMP = 'ofTimestamp';

IssOrbit.DATA_MARKERS = 'markers';
IssOrbit.DATA_EVENTS_INTERVAL = 'events-interval';
IssOrbit.DATA_EVENTS_SPOT = 'events-spot';

IssOrbit.POSITION_NEXT = 'next';
IssOrbit.POSITION_PREV = 'prev';