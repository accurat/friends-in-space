var FIS_ORBIT_COLOR = "#FFFF00";
var FIS_OFF_ORBIT_GREEN = "#08AD80";
var FIS_ORBIT_NOT_ORBIT_COLOR = "#333";
var FIS_ORBIT_NOT_ORBIT_COLOR_LIGHTER = "#777";

SmallOrbitChart = function (container) {
    var self = this;
    self._usersClusterVectorSource = null;


    self._container = container;


    self._whiteStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: 'white'
            }),
            stroke: new ol.style.Stroke({
                width: 1,
                color: 'black'
            })
        })
    });
    self._greenStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: FIS_OFF_ORBIT_GREEN
            }),
            stroke: new ol.style.Stroke({
                width: 1,
                color: 'black'
            })
        })
    });
    self._lineWhiteStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'white',
            width: 0.5
        })
    });
    self._lineGreenStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: FIS_OFF_ORBIT_GREEN,
            width: 0.5
        })
    });

};

SmallOrbitChart.prototype.init = function (userId, orbit, users, orbitId) {
    var self = this;
    self._userId = userId;
    self._users = users;
    self._orbit = orbit;
    self._orbitId = orbitId;


    self._map = new ol.Map({
        interactions: [],
        controls: [],
        target: self._container,
        layers: [],
        view: new ol.View({
                center: ol.proj.transform([0, 0], 'EPSG:4326', 'EPSG:3857'),
                resolution: 90000,
                maxResolution: 90000,
                minResolution: 90000
            }
        )
    });

    for (var i = 0; i < self._users.length; i++) {
        if (self._users[i].userId == self._userId) {
            self._currentUserData = self._users[i];

            self._onOrbitView = self._users[i].onOrbit;
            break;
        }
    }
    if (self._currentUserData == null) {
        console.error("Can't find current user data");
        return;
    }

    self._initOrbitLayer();
    self._initUserLayers();
    self._initGreetingsLayer();

    self._map.addLayer(self._orbitLayer);


    self._map.addLayer(self._usersGreetingsLayer);
    self._map.addLayer(self._usersClusterLayer);
    self._map.addLayer(self._usersOutOrbitLayer);


    var postComposeCount = 0;

    if (self._initGreetingsLinkLayer()) {
        self._map.addLayer(self._usersGreetingsLinkLayer);
    }

    self._map.on('postcompose', function () {
        postComposeCount++;
        if (postComposeCount > 1) {
            self._cleanAndRepaint();
        }
    });
};
SmallOrbitChart.prototype._destroy = function () {
    var self = this;
    self._map.removeLayer(self._orbitLayer);
    self._map.removeLayer(self._usersGreetingsLayer);
    self._map.removeLayer(self._usersClusterLayer);
    self._map.removeLayer(self._usersOutOrbitLayer);
    self._map.removeLayer(self._usersGreetingsLinkLayer);

    self._currentUserData = null;
    self._userId = null;
    self._users = null;
    self._orbit = null;
    self._onOrbitView = null;


};
SmallOrbitChart.prototype._cleanAndRepaint = function () {
    var self = this;
    var canvas = $(self._container).find('canvas')[0];

    var context = canvas.getContext('2d');

    var newCanvas = $('<canvas></canvas>');
    newCanvas.width("100%");
    var ratio = window.devicePixelRatio;
    newCanvas[0].width = 470 * ratio;
    newCanvas[0].height = 240 * ratio;

    var newContext = newCanvas[0].getContext('2d');
    newContext.fillRect(0, 0, 470 * ratio, 240 * ratio);
    newContext.drawImage(context.canvas, 0, 0);
    self._destroy();
    self._map.setTarget();
    self._map = null;
    $(self._container).append(newCanvas);
    $(self._container).css({
        width: "100%",
        height: "auto"
    });

};

SmallOrbitChart.prototype._initOrbitLayer = function () {
    var self = this;
    var orbitGeom = new ol.geom.LineString(self._orbit.coordinates).transform('EPSG:4326', 'EPSG:3857');

    var orbitFeature = new ol.Feature({geometry: orbitGeom});
    var orbitSource = new ol.source.Vector({features: []});

    var orbitStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: self._onOrbitView ? FIS_ORBIT_COLOR : FIS_ORBIT_NOT_ORBIT_COLOR,
            width: 1
        })
    });
    orbitFeature.setStyle(orbitStyle);
    self._orbitLayer = new ol.layer.Vector({
        source: orbitSource
    });
    orbitSource.addFeature(orbitFeature);
};

SmallOrbitChart.prototype._isLinked = function (userId) {
    var self = this;
    if (self._currentUserData.greetingLinks == null) {
        return {linked: false};
    }
    for (var i = 0; i < self._currentUserData.greetingLinks.length; i++) {
        var link = self._currentUserData.greetingLinks[i];
        if (userId == link.startUserId || userId == link.endUserId) {
            return {linked: true, started: link.started};
        }
    }
    return {linked: false};
};


SmallOrbitChart.prototype._initUserLayers = function () {
    var self = this;

    self._usersClusterVectorSource = new ol.source.Vector({features: []});
    self._usersOutOrbitVectorSource = new ol.source.Vector({features: []});


    for (var i = 0; i < self._users.length; i++) {
        var user = self._users[i];
        var linked = self._isLinked(user.userId);
        if (user.onOrbit) {
            var feature = new ol.Feature({
                geometry: new ol.geom.Point(user.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                properties: {
                    samGreetingsDist: user.samGreetingsDist,
                    isLinked: linked.linked
                }
            });
            feature.setId(user.userId);
            self._usersClusterVectorSource.addFeature(feature);
        } else {
            //draw off orbit single markers
            if (linked.linked || user.userId == self._userId) {
                var feature = new ol.Feature({
                    geometry: new ol.geom.Point(user.coordinates).transform('EPSG:4326', 'EPSG:3857'),
                    properties: {
                        isLinked: linked.linked
                    }
                });
                feature.setId(user.userId);
                if (user.userId == self._userId) {
                    feature.setStyle([self._greenStyle, new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 50,
                            stroke: new ol.style.Stroke({
                                color: 'white',
                                width: 2
                            })
                        })
                    })]);
                } else {
                    feature.setStyle(self._greenStyle);
                }

                self._usersOutOrbitVectorSource.addFeature(feature);
            }
        }


    }


    self._usersClusterSource = new ol.source.Cluster({
        distance: 20,
        source: self._usersClusterVectorSource
    });

    self._usersClusterLayer = new ol.layer.Vector({
        source: self._usersClusterSource,
        style: function (feature, resolution) {
            return self._clusterStyling(self._onOrbitView, feature, resolution);
        }
    });

    self._usersOutOrbitLayer = new ol.layer.Vector({
        source: self._usersOutOrbitVectorSource
    });


};
SmallOrbitChart.prototype._initGreetingsLayer = function () {
    var self = this;


    self._usersGreetingsLayer = new ol.layer.Vector({
        source: self._usersClusterLayer.getSource(),
        opacity: 0.3,
        style: function (feature, resolution) {
            return self._greetingsStyling(self._onOrbitView, feature, resolution);
        }
    });

};


_getClusterType = function (features) {
    var type = 1;
    var size = features.length;

    if (size > 1 && size < 5) {
        type = 2;
    } else if (size >= 5 && size < 10) {
        type = 3;
    } else if (size >= 10 && size < 15) {
        type = 4;
    } else if (size >= 15) {
        type = 5;
    }
    return type;
};

SmallOrbitChart.prototype._clusterStyling = function (viewType, feature, resolution) {

    if (feature == undefined || feature.get('features') == undefined) {
        return;
    }
    var self = this;
    var features = feature.get('features');
    var type = _getClusterType(features);
    var color, strokeStyle;
    var styles = [];
    var isLinked = false,
        isLinkedStarted = false;
    for (var i = 0; i < features.length; i++) {
        if (features[i].getId() == self._userId) {
            color = 'white';
            strokeStyle = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 50,
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 2
                    })
                })
            });

            break;
        }
    }
    for (var i = 0; i < features.length; i++) {
        var properties = features[i].get('properties');
        if (properties != null && properties.isLinked) {
            isLinked = true;
            break;
        }
    }


    if (color == null && isLinked) {
        color = FIS_OFF_ORBIT_GREEN;
    } else if (color == null && !isLinked) {
        color = viewType ? FIS_ORBIT_COLOR : FIS_ORBIT_NOT_ORBIT_COLOR_LIGHTER
    }


    var style = new ol.style.Style({
        image: new ol.style.Star({
            type: type,
            fill: new ol.style.Fill({
                color: color
            }),
            stroke: new ol.style.Stroke({
                color: 'black'
            })
        })
    });
    styles.push(style);
    if (strokeStyle)
        styles.push(strokeStyle);
    return styles;

};

SmallOrbitChart.prototype._greetingsStyling = function (onOrbit, feature, resolution) {


    if (feature == undefined || feature.get('features') == undefined) {
        return;
    }

    var features = feature.get('features');
    var size = features.length;
    var distance = 100;
    for (var i = 0; i < size; i++) {
        var properties = features[i].get('properties');
        if (properties.samGreetingsDist != null) {
            distance = Math.min(distance, properties.samGreetingsDist);
        }
    }
    distance = Math.floor((100 - distance) * 0.8);

    if(distance > 0){
        distance +=10;
    }

    var style = new ol.style.Style({
        image: new ol.style.Circle({
            radius: distance,
            fill: new ol.style.Fill({
                color: onOrbit ? FIS_ORBIT_COLOR : "#777"
            })
        })
    });
    return [style];

};

SmallOrbitChart.prototype._initGreetingsLinkLayer = function (user, users) {
    var self = this;
    //get user links
    var currentUserData;
    for (var i = 0; i < self._users.length; i++) {
        if (self._users[i].userId == self._userId) {
            currentUserData = self._users[i];
        }
    }


    if (!currentUserData.greetingLinks) {
        return false;
    }

    var linkSource = new ol.source.Vector({
        features: []
    });


    for (var i = 0; i < currentUserData.greetingLinks.length; i++) {
        var link = currentUserData.greetingLinks[i];
        var arc = self._createGreetingsLinkArc(link);
        if (arc == null) {
            continue;
        }
        var feature = new ol.Feature({
            geometry: new ol.geom.LineString(arc).transform('EPSG:4326', 'EPSG:3857')
        });
        feature.setStyle(link.started ? self._lineGreenStyle: self._lineWhiteStyle );

        linkSource.addFeature(feature);
    }

    self._usersGreetingsLinkLayer = new ol.layer.Vector({
        source: linkSource
    });
    return true;

};


SmallOrbitChart.prototype._findUserCluster = function (userId) {
    var self = this;
    var clusterMarkers = self._usersClusterLayer.getSource().getFeatures();
    for (var i = 0; i < clusterMarkers.length; i++) {
        var cluster = clusterMarkers[i];
        var clusterFeatures = cluster.get('features');

        for (var f = 0; f < clusterFeatures.length; f++) {
            var feature = clusterFeatures[f];
            if (feature.getId() == userId) {
                return ol.proj.transform(cluster.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');
            }
        }

    }
    return null;
};


SmallOrbitChart.prototype._createGreetingsLinkArc = function (link) {
    var self = this;

    //find start feature
    var startCoords = self._findUserCluster(link.startUserId);
    var endCoords = self._findUserCluster(link.endUserId);


    for (var i = 0; i < self._users.length; i++) {
        var user = self._users[i];
        if (startCoords == null && user.userId == link.startUserId) {
            startCoords = user.coordinates;
        }
        if (endCoords == null && user.userId == link.endUserId) {
            endCoords = user.coordinates;
        }
        if (startCoords != null && endCoords != null) {
            break;
        }
    }

    if (startCoords == null || endCoords == null) {
        return null;
    }
    if (startCoords[0] == endCoords[0]) {
        return null;
    }

    var arcGenerator = new ArcJs.GreatCircle({x: (startCoords[0] + 180) / 2, y: startCoords[1]}, {x: (endCoords[0] + 180) / 2, y: endCoords[1]});
    var linkArc = arcGenerator.Arc(50, {offset: 1}).geometries[0].coords;

    for (var i = 0; i < linkArc.length; i++) {
        linkArc[i][0] = (linkArc[i][0] * 2) - 180;
    }
    return linkArc;

};