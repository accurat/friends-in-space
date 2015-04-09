//requires: gju
var logger = FIS.Log.getLogger('math');


var EARTH_RADIUS_M = 6378137;
var gju = Npm.require('geojson-utils');


//http://www.wikihow.com/Calculate-the-Distance-to-the-Horizon
function getHorizon(altitudeMeters) {
    var r = EARTH_RADIUS_M * 0.8;
    return r * Math.acos(r / (r + altitudeMeters));
}

function isOnOrbit(orbit, coordinates) {

    for (var i = 0; i < orbit.coordinates.length; i++) {
        //calculate orbit point horizon
        var h = getHorizon(orbit.altitudes[i] * 1000);
        var d = gju.pointDistance({type: 'Point', coordinates: coordinates}, {type: 'Point', coordinates: orbit.coordinates[i]});
        if (d <= h) {
            return true;
        }
    }
    return false;
}




FIS.Math = {
    getHorizon: getHorizon,
    isOnOrbit: isOnOrbit
};