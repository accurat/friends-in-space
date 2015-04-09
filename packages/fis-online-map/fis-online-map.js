var FIS_TIME_COLORS = ["#08AD80", "#2caa94", "#50a7a9", "#74a4be", "#98a2d3"];
var FIS_ORBIT_COLOR = "#FFFF00";
var FIS_CONSTELLATION_COLOR = "rgba(175,175,175,0.3)";
var FIS_GREETINGS_LINK_DELAY = 10000;


OnlineMap = {

    _map: undefined,
    _dom: {},

    //overlay popup
    _overlayPopup: undefined,
    _overlayFeatureId: undefined,
    _overlayPersistent: false,

    //complete coordinates of the current orbit
    _currentOrbitCoordinates: undefined,
    _currentOrbitTimestamps: undefined,
    _currentOrbitAltitudes: undefined,

    //dashed orbit layer
    _fullOrbitLayer: undefined,

    //iss position as index of _currentOrbitCoordinates/timestamps/altitudes
    _issPositionIndex: undefined,
    // iss partial orbit layer
    _issOrbitLayer: undefined,
    // iss position layer
    _issPositionLayer: undefined,

    //current user
    _highlightedUser: undefined,
    _highlightedSam: undefined,

    //users on orbit
    _usersClusterLayer: undefined,
    _usersClusterVectorSource: undefined,
    _clusterStyleCache: {},
    _usersGreetingsLayer: undefined,
    _greetingsStyleCache: {},

    //constellations
    _constellationLayer: undefined,

    //greetings links
    _greetingsLinkTimeQueue: {},
    _myLastGreetingsLinkTime: undefined,
    _greetingsLinkQueue: [],
    _greetingsHandlerStarted: false,
    _greetingsLinkStyleStarted: new ol.style.Stroke({color: '#08AD80', width: 0.5}),
    _greetingsLinkStyleReceived: new ol.style.Stroke({color: 'white', width: 0.5}),
    _samGreetingsCircleElement: undefined,
    _samIssCircleStyle1: undefined,
    _samIssCircleStyle2: undefined,

    // Init the map
    init: function (container) {
        var self = this;


        self._dom.map = $(container);
        self._dom.singleMarkerPopup = $('<div class="single-marker-popup"><div class="image"></div><div class="user"><span class="user-name"></span> &#8213; <span class="user-location"></span></div><div class="statistics"><span class="sam-orbits"><span class="sam-orbits-number"></span> ORBITS WITH SAM</span> / <span class="connected-people"><span class="connected-people-number"></span> FRIENDS IN SPACE</span></div><div class="not-logged-in-notice">log in for more features</div><div class="actions"><span class="popup-action"><a class="interactions user-interactions"><span>See Activity</span></a></span><span class="twitter-interactions"><span class="popup-action"><a class="interactions tweet" href="" onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=500,height=500,toolbar=1,resizable=0\'); return false;">Tweet</a></span><span class="popup-action"><a class="interactions twitter-account" href="" target="_blank">Twitter profile</a></span></span><span class="google-plus-interactions"><span class="popup-action"><a class="interactions google-plus-account" href="" target="_blank">Google+ profile</a></span></span><span class="facebook-interactions"><span class="popup-action"><a class="interactions facebook-account" href="" target="_blank">Facebook profile</a></span></span></div></div>')
        self._dom.clusterMarkerPopup = $('<div class="cluster-marker-popup"><span class="text"><span class="people"></span> PEOPLE</span> &#8213; <span class="location"></span></div>');

        var circle1 = document.createElement('div');
        var circle2 = document.createElement('div');
        var circle3 = document.createElement('div');
        circle1.setAttribute('class', 'sam-circle sam-greeting-circle-1');
        circle2.setAttribute('class', 'sam-circle sam-greeting-circle-2');
        circle3.setAttribute('class', 'sam-circle sam-greeting-circle-3');
        var elem = document.createElement('div');
        elem.appendChild(circle1);
        elem.appendChild(circle2);
        elem.appendChild(circle3);

        self._samGreetingsCircleElement = elem;

        //self._transparentTileLayer = new ol.layer.Tile({
        //    source: new ol.source.OSM({
        //        url: 'https://a.tiles.mapbox.com/v3/accurat.6dec003d/{z}/{x}/{y}.png'
        //    })
        //});

        self._transparentStyleCache = [];
        self._transparentCountriesLayer = new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                projection: 'EPSG:3857',
                url: 'data/countries.geo.json'
            }),
            opacity: 0.3,
            style: function (feature, resolution) {
                var text = resolution < 5000 ? decodeURIComponent(feature.get('name')) : '';
                if (!self._transparentStyleCache[text]) {
                    self._transparentStyleCache[text] = [new ol.style.Style({
                        fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0)'}),
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 255, 255, 1)', width: 0.5}),
                        text: new ol.style.Text({
                            font: '13px Akkurat, Calibri, sans-serif',
                            text: text,
                            fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 1)'})
                        })
                    })];
                }
                return self._transparentStyleCache[text];
            }
        });


        self._transparentCitiesLayer = new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                projection: 'EPSG:3857',
                url: 'data/cities.geo.json'
            }),
            opacity: 0.3,
            style: function (feature, resolution) {
                var text = resolution < 2500 ? decodeURIComponent(feature.get('city')) : '';
                if (!self._transparentStyleCache[text]) {
                    self._transparentStyleCache[text] = [new ol.style.Style({
                        text: new ol.style.Text({
                            font: '10px Akkurat, Calibri, sans-serif',
                            text: text,
                            fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 1)'})
                        })
                    })];
                }
                return self._transparentStyleCache[text];
            }
        });



        self._transparentCountriesLayer.setVisible(false);
        self._transparentCitiesLayer.setVisible(false);

        self._map = new ol.Map({
            controls: [new ol.control.Zoom({
                className: 'fis-online-map-zoom'
            })],
            logo: false,
            target: self._dom.map[0],
            layers: [
                self._transparentCountriesLayer,self._transparentCitiesLayer
            ],
            view: new ol.View({
                    center: ol.proj.transform([0, 20], 'EPSG:4326', 'EPSG:3857'),
                    zoom: 2,
                    maxZoom: 11,
                    minZoom: 2
                }
            )
        });

        //init sam ISS inside circle styles
        self._samIssCircleStyle1 = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                snapToPixel: false,
                fill: new ol.style.Fill({
                    color: '#FFFFFF'
                }),
                stroke: new ol.style.Stroke({
                    color: '#000000',
                    width: 4
                })
            })
        });
        self._samIssCircleStyle2 = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                snapToPixel: false,
                fill: new ol.style.Fill({
                    color: '#d4145a'
                }),
                stroke: new ol.style.Stroke({
                    color: '#000000',
                    width: 4
                })
            })
        });



        self._map.getView().on('change:resolution', function () {

            var zoom = self._map.getView().getZoom();

            if (self._constellationLayer != undefined && zoom != undefined) {
                if (zoom != 2) {
                    self._constellationLayer.setVisible(false);
                } else {
                    self._constellationLayer.setVisible(true);
                }
            }
        });


        //setup popup for users and cluster
        self._singleOverlayPopup = new ol.Overlay({
            element: self._dom.singleMarkerPopup,
            positioning: 'top-right'
        });
        self._clusterOverlayPopup = new ol.Overlay({
            element: self._dom.clusterMarkerPopup,
            positioning: 'top-right'
        });

        self._map.addOverlay(self._singleOverlayPopup);
        self._map.addOverlay(self._clusterOverlayPopup);


        self._sphere = new ol.Sphere(6378137);

        //init layers
        self._initConstellationLayer();
        self._initCurrentOrbitLayer();
        self._initISSPositionLayer();
        self._initUserLayer();
        self._initGreetingsLayer();
        self._map.addLayer(self._usersGreetingsLayer);
        self._map.addLayer(self._fullOrbitLayer);
        self._map.addLayer(self._issOrbitLayer);
        self._map.addLayer(self._constellationLayer);
        self._map.addLayer(self._usersClusterLayer);


        //init hover
        $(self._map.getViewport()).on('mousemove', function (evt) {
            var pixel = self._map.getEventPixel(evt.originalEvent);
            self.displayFeatureInfo(pixel);
        });

        $(self._map.getViewport()).on('click', function (evt) {
            var pixel = self._map.getEventPixel(evt.originalEvent);
            var hoveredFeatures = self._map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                if (layer == self._usersGreetingsLayer)
                    return null;
                else
                    return feature;
            });
            if (hoveredFeatures == undefined) {
                self._overlayPersistent = false;
                self._overlayFeatureType = undefined;
                self.updatePopupBorder();
                self.hideFeatureInfo();
                return;
            }

            var features = hoveredFeatures.get('features');

            if (features == null || features[0] == undefined) {
                return;
            }

            if (features.length > 1) {


                var cluster = self._findUserCluster(features[0].getId());
                if (cluster) {

                    var clusterFeatures = cluster.get('features');
                    var coords = [];
                    for (var i = 0; i < clusterFeatures.length; i++) {
                        coords.push(clusterFeatures[i].getGeometry().getCoordinates());
                    }
                    var extent = ol.extent.boundingExtent(coords);
                    var halfSize = [self._map.getSize()[0] / 2, self._map.getSize()[1] / 2];
                    self.hideFeatureInfo();
                    self._map.getView().fitExtent(extent, halfSize);
                }
            } else if (features.length == 1) {

                if (self._overlayPersistent && self._overlayFeatureType == 'user') {
                    //disabele persistent
                    self._overlayPersistent = false;
                    self.updatePopupBorder();
                } else if (!self._overlayPersistent && self._overlayFeatureType == 'user') {
                    self._overlayPersistent = true;
                    self.updatePopupBorder();
                }

            }
        });
    },
    _initCurrentOrbitLayer: function () {
        var self = this;

        if (self._fullOrbitLayer == undefined) {


            var orbitVector = new ol.source.Vector({features: []});

            self._fullOrbitLayer = new ol.layer.Vector({
                source: orbitVector,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: FIS_ORBIT_COLOR,
                        width: 0.5,
                        lineDash: [5, 10]
                    })
                })
            });
        }
        return self._fullOrbitLayer;
    },
    _initUserLayer: function () {
        var self = this;

        if (self._usersClusterLayer == undefined) {

            self._usersClusterVectorSource = new ol.source.Vector({features: []});

            //TODO FIX cluster distance
            var clusterSource = new ol.source.Cluster({
                distance: 10,
                source: self._usersClusterVectorSource
            });

            self._usersClusterLayer = new ol.layer.Vector({
                source: clusterSource,
                style: function (feature, resolution) {
                    return self._clusterStyling(feature, resolution);
                }
            });

        }
        return self._usersClusterLayer;
    },
    _initGreetingsLayer: function () {
        var self = this;

        if (self._usersGreetingsLayer == undefined) {


            self._usersGreetingsLayer = new ol.layer.Vector({
                source: self._usersClusterLayer.getSource(),
                opacity: 0.2,
                style: self._greetingsStyling
            });
        }
        return self._usersGreetingsLayer;
    },
    _initISSPositionLayer: function () {
        var self = this;
        if (self._issOrbitLayer == null) {


            var issOrbitVector = new ol.source.Vector({
                features: []
            });

            self._issOrbitLayer = new ol.layer.Vector({
                source: issOrbitVector,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: FIS_ORBIT_COLOR,
                        width: 3
                    })
                })
            });


        }
        return self._issOrbitLayer;
    },
    _initConstellationLayer: function () {
        var self = this;
        if (self._constellationLayer == undefined) {

            var constellationSource = new ol.source.Vector({features: []});

            self._constellationLayer = new ol.layer.Vector({
                source: constellationSource,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: FIS_CONSTELLATION_COLOR,
                        lineWidth: 1
                    })
                })
            });

        }
        return self._constellationLayer;
    },
    destroy: function () {
        var self = this;

        self._currentOrbitCoordinates = null;
        self._currentOrbitTimestamps = null;
        self._currentOrbitAltitudes = null;


        //clear cache
        self._greetingsStyleCache = {};
        self._clusterStyleCache = {};

        self._issOrbitLayer.getSource().clear();
        self._fullOrbitLayer.getSource().clear();
        self._issPositionLayer.getSource().clear();
        self._constellationLayer.getSource().clear();
        self._usersClusterVectorSource.clear();
        self._usersClusterLayer.getSource().clear();
        self._usersGreetingsLayer.getSource().clear();


        self._map.removeLayer(self._issOrbitLayer);
        self._map.removeLayer(self._fullOrbitLayer);
        self._map.removeLayer(self._issPositionLayer);
        self._map.removeLayer(self._constellationLayer);
        self._map.removeLayer(self._usersClusterLayer);
        self._map.removeLayer(self._usersGreetingsLayer);

        self._issOrbitLayer = null;
        self._fullOrbitLayer = null;
        self._issPositionLayer = null;
        self._constellationLayer = null;
        self._usersClusterVectorSource = null;
        self._usersClusterLayer = null;
        self._usersGreetingsLayer = null;

        self._issPositionIndex = undefined;


        //clear popups

        self._map.removeOverlay(self._overlayPopup);
        self._map.removeOverlay(self._highlightedUser);
        self._map.removeOverlay(self._highlightedSam);
        self._map.removeOverlay(self._singleOverlayPopup);
        self._map.removeOverlay(self._clusterOverlayPopup);
        self._overlayFeatureId = null;
        self._overlayPopup = null;
        self._highlightedUser = null;
        self._highlightedSam = null;
        self._singleOverlayPopup = null;
        self._clusterOverlayPopup = null;


        self._greetingsLinkTimeQueue = {};
        self._myLastGreetingsLinkTime = null;
        self._greetingsLinkQueue = [];

        self._stopGreetingsLinkDrawer();

        self._dom.singleMarkerPopup.remove();
        self._dom.clusterMarkerPopup.remove();

        self._map = null;

    },

    resetZoom: function () {
        var self = this;
        self._map.getView().setZoom(2);
        self._map.getView().setCenter(ol.proj.transform([0, 20], 'EPSG:4326', 'EPSG:3857'));
    },

    showMap: function () {
        var self = this;
        self._transparentCountriesLayer.setVisible(true);
        self._transparentCitiesLayer.setVisible(true);
    },
    hideMap: function () {
        var self = this;
        self._transparentCountriesLayer.setVisible(false);
        self._transparentCitiesLayer.setVisible(false);
    },

    // Update the current Orbit
    updateCurrentOrbit: function (orbitData) {
        var self = this;

        self._currentOrbitCoordinates = [];
        self._currentOrbitTimestamps = orbitData.timestamps;
        self._currentOrbitAltitudes = orbitData.altitudes;

        for (var i = 0; i < orbitData.coordinates.length; i++) {
            var coords = ol.proj.transform(orbitData.coordinates[i], 'EPSG:4326', 'EPSG:3857');
            self._currentOrbitCoordinates.push([coords[0], coords[1]]);
        }

        var fullOrbitGeom = new ol.geom.LineString(self._currentOrbitCoordinates);

        //add first time the full orbit or update it
        self._fullOrbitLayer.getSource().clear();
        var fullOrbit = new ol.Feature({
            geometry: fullOrbitGeom
        });
        self._fullOrbitLayer.getSource().addFeature(fullOrbit);
        self._map.renderSync();

    },

    // Update the ISS Position by timestamp
    updateISSPosition: function (timestamp) {
        var self = this;
        if (self._currentOrbitTimestamps == null) {
            return;
        }


        for (var i = 0; i < self._currentOrbitTimestamps.length; i++) {
            self._issPositionIndex = i;
            if (self._currentOrbitTimestamps[i] > timestamp) {
                break;
            }
        }
        if (self._issPositionIndex == 0) {
            console.error("Can't update iss Position, it's in another space...");
            //hiding ISS
            self._issOrbitLayer.getSource().clear();
            self._map.removeLayer(self._issPositionLayer);
            self._issPositionLayer.getSource().clear();
            self._issPositionLayer = null;
            Session.set(FIS.KEYS.CURR_ORBIT_PER, null);
            return;
        }
        var percent = Math.round((self._issPositionIndex / self._currentOrbitTimestamps.length) * 100);
        Session.set(FIS.KEYS.CURR_ORBIT_PER, percent);


        var issOrbitGeom = new ol.geom.LineString(self._currentOrbitCoordinates.slice(0, self._issPositionIndex + 1));
        var issOrbit = new ol.Feature({
            geometry: issOrbitGeom
        });
        self._issOrbitLayer.getSource().clear();
        self._issOrbitLayer.getSource().addFeature(issOrbit);


        //configure and update the iss position
        var fillColor = self._samGreetingsOverlay ? '#d4145a' : '#FFFFFF';

        if (self._issPositionLayer == null) {
            var issPosition = new ol.Feature({
                geometry: new ol.geom.Point(self._currentOrbitCoordinates[self._issPositionIndex])
            });

            if (self._samGreetingsOverlay) {
                issPosition.setStyle(self._samIssCircleStyle2);
            } else {
                issPosition.setStyle(self._samIssCircleStyle1);
            }


            var coords = self._currentOrbitCoordinates[self._issPositionIndex];

            var wgs84coords = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
            Session.set(FIS.KEYS.CURR_ORBIT_LOC, [wgs84coords[0], wgs84coords[1]]);


            //external circle removed
            var radius = self._getHorizon(self._currentOrbitAltitudes[self._issPositionIndex] * 1000);
            var issPositionExt = new ol.Feature({
                geometry: ol.geom.Polygon.circular(self._sphere, wgs84coords, radius, 64).transform('EPSG:4326', 'EPSG:3857')
            });
            issPositionExt.setStyle(new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#FFFFFF',
                    width: 0.5
                })
            }));

            var issPositionVector = new ol.source.Vector({
                features: [issPosition, issPositionExt]
            });

            self._issPositionLayer = new ol.layer.Vector({
                source: issPositionVector
            });

            self._map.addLayer(self._issPositionLayer);
        } else {

            var coords = self._currentOrbitCoordinates[self._issPositionIndex];
            var features = self._issPositionLayer.getSource().getFeatures();
            features[0].setGeometry(new ol.geom.Point(coords));
            var wgs84coords = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
            if (self._highlightedSam) {
                self._highlightedSam.setPosition(coords);
            }

            Session.set(FIS.KEYS.CURR_ORBIT_LOC, [wgs84coords[0], wgs84coords[1]]);

            if (self._samGreetingsOverlay) {
                features[0].setStyle(self._samIssCircleStyle2);
            } else {
                features[0].setStyle(self._samIssCircleStyle1);
            }

            //external circle removed
            var radius = self._getHorizon(self._currentOrbitAltitudes[self._issPositionIndex] * 1000);
            features[1].setGeometry(ol.geom.Polygon.circular(self._sphere, wgs84coords, radius, 64).transform('EPSG:4326', 'EPSG:3857'));
        }

    },


    addCurrentUser: function (user) {
        var self = this;
        var cluster = self._findUserCluster(user.userId);
        if (cluster == null) {
            console.error("Can't find cluster on adding Current User");
            return false;
        }
        var features = cluster.get('features');
        var type = OnlineMap._getClusterType(features);
        user.clusterType = type;
        Session.set(FIS.KEYS.USER, user);
        return true;
    },
    removeCurrentUser: function (user) {
        Session.set(FIS.KEYS.USER, null);
    },
    updateCurrentUser: function (user) {
        var self = this;
        if (user == null) {
            console.error("Current User not saved on session");
            return;
        }
        if(!user.online){
            return;
        }
        var cluster = self._findUserCluster(user.userId);
        if (cluster == null) {
            console.error("Can't find cluster on updating Current User");
            return;
        }
        var features = cluster.get('features');
        var type = OnlineMap._getClusterType(features);
        user.clusterType = type;
        Session.set(FIS.KEYS.USER, user);
    },

    // ================================================================================
    // ===============================       STARS         ============================
    // ================================================================================

    //TODO only required user properties
    _createUserFeature: function (user) {
        var feature = new ol.Feature({
            geometry: (new ol.geom.Point(user.coordinates)).transform('EPSG:4326', 'EPSG:3857'),
            type: 'user',
            properties: user
        });
        feature.setId(user.userId);
        return feature;
    },

    _findUserFeature: function (userId) {
        var self = this;
        if (self._usersClusterVectorSource != undefined) {
            return self._usersClusterVectorSource.getFeatureById(userId)
        } else {
            return null;
        }
    },


    addOnlineUser: function (user) {
        var self = this;
        if (self._usersClusterVectorSource.getFeatureById(user.userId) != null) {
            console.error("User already on the map");
        } else {
            self._usersClusterVectorSource.addFeature(self._createUserFeature(user));
            if (user.userId == Meteor.userId() || user.userId == Session.get(FIS.KEYS.UUID)) {


                function waitForChange() {
                    var self = this;
                    if (self._usersClusterLayer.getSource().getFeatures().length >= 1) {
                        if (self.addCurrentUser(user)) {
                            self._usersClusterLayer.un('change', waitForChange, self);
                        }
                    }
                }

                self._usersClusterLayer.on('change', waitForChange, self);
            }
        }
    },
    removeOnlineUser: function (user) {
        var self = this;
        var userFeature = self._findUserFeature(user.userId);
        self._usersClusterVectorSource.removeFeature(userFeature);
        if (user.userId == Meteor.userId() || user.userId == Session.get(FIS.KEYS.UUID)) {
            self.removeCurrentUser(user);
        }
    },
    updateOnlineUser: function (user) {
        var self = this;
        var userFeature = self._findUserFeature(user.userId);
        if (userFeature != null) {

            var properties = userFeature.get('properties');

            var userUpdateCoords = new ol.geom.Point(user.coordinates).transform('EPSG:4326', 'EPSG:3857');
            var coords = userFeature.getGeometry().getCoordinates();
            if (coords[0] != userUpdateCoords[0] || coords[1] != userUpdateCoords[1]) {
                userFeature.setGeometry(userUpdateCoords);
            }

            var userStatusOnlineChanged = false;
            if(properties.online != user.online){
                userStatusOnlineChanged = true;
            }
            properties.online = user.online;
            properties.onOrbit = user.onOrbit;

            properties.lastActivity = user.lastActivity;

            //display simple hellos
            if (user.earthGreetingsActivity != properties.earthGreetingsActivity) {

                //user said HI display greetings!!
                properties.earthGreetingsActivity = user.earthGreetingsActivity;
                properties.samGreetingsDist = user.samGreetingsDist;

                self.displayGreetings({userId: user.userId}, false);


                var now = moment.utc().valueOf();

                var currentUserGreets = Session.get(FIS.KEYS.USER).userId == user.userId;

                if (currentUserGreets) {
                    //I've said a hi
                    self._myLastGreetingsLinkTime = user.earthGreetingsActivity;

                } else {
                    //somebody else said hi
                    self._greetingsLinkTimeQueue[user.userId] = user.earthGreetingsActivity;
                }

                for (var userId in self._greetingsLinkTimeQueue) {
                    if ((now - self._greetingsLinkTimeQueue[userId]) > FIS_GREETINGS_LINK_DELAY) {
                        delete self._greetingsLinkTimeQueue[userId];
                        continue;
                    }
                }

                if (currentUserGreets) {
                    var userIdLinks = Object.keys(self._greetingsLinkTimeQueue);
                    for (var userId in self._greetingsLinkTimeQueue) {
                        //using user.userId because that's me
                        Meteor.call('saveLinkGreetingActivity',Session.get(FIS.KEYS.USER).type, user.userId, userId, true, function (err, data) {
                        });
                        self.createGreetingsLink(user.userId, userId, true);
                    }

                } else {

                    if ((now - self._myLastGreetingsLinkTime) > FIS_GREETINGS_LINK_DELAY) {
                        self._myLastGreetingsLinkTime = null;
                    }

                    if (self._myLastGreetingsLinkTime != null) {
                        for (var userId in self._greetingsLinkTimeQueue) {
                            if (self._greetingsLinkTimeQueue[userId] >= self._myLastGreetingsLinkTime) {
                                self.createGreetingsLink(userId, Session.get(FIS.KEYS.USER).userId, false);
                                Meteor.call('saveLinkGreetingActivity', Session.get(FIS.KEYS.USER).type, userId, Session.get(FIS.KEYS.USER).userId, false, function (err, data) {
                                    if (err) {
                                        console.error("Error saving greetings activity");
                                    }
                                });
                            }
                        }
                    }
                }
            }

            //display hello sams
            if (properties.samGreetingsActivity != user.samGreetingsActivity && user.samGreetingsActivity != null) {
                //user said hello sam
                properties.samGreetingsActivity = user.samGreetingsActivity;
                properties.samGreetingsDist = user.samGreetingsDist;
                self.displayGreetings({userId: user.userId}, true);
            }

            if (user.userId == Meteor.userId() || user.userId == Session.get(FIS.KEYS.UUID)) {
                self.updateCurrentUser(user);
            }



        } else {
            console.error("Can't find user to update");
        }
    },

    updateOnlineUserLayer: function () {
        var self = this;
        if (self._usersClusterVectorSource != undefined && self._usersClusterVectorSource.getFeatures().length > 0) {
            //force dispatch change for update the cluster style
            self._usersClusterVectorSource.dispatchEvent('change');
            self.updateCurrentUser(Session.get(FIS.KEYS.USER));
        }
    },

    _hasGhostFeatures: function (features) {
        for (var i = 0; i < features.length; i++) {
            var properties = features[i].get('properties');
            if (!properties.online) {
                return true;
            }
        }
        return false;
    },
    _countNonGhostFeatures: function (features) {
        var size = 0;
        for (var i = 0; i < features.length; i++) {
            var properties = features[i].get('properties');
            if (properties.online) {
                size++;
            }
        }
        return size;
    },
    _getNonGhostFeatures: function (features) {
        var out = [];
        for (var i = 0; i < features.length; i++) {
            var properties = features[i].get('properties');
            if (properties.online) {
                out.push(features[i]);
            }
        }
        return out;
    },

    _getClusterType: function (features) {
        var self = this;
        var type = 0;
        var size = self._countNonGhostFeatures(features);


        if (size == 1) {
            type = 1
        } else if (size > 1 && size < 5) {
            type = 2;
        } else if (size >= 5 && size < 10) {
            type = 3;
        } else if (size >= 10 && size < 15) {
            type = 4;
        } else if (size >= 15) {
            type = 5;
        } else {
            type = -1;
        }
        return type;
    },

    _clusterStyling: function (feature, resolution) {
        var self = this;
        if (feature == undefined || feature.get('features') == undefined) {
            console.error("feature undefined", feature);
            return;
        }

        var features = feature.get('features');
        var clusterSize = 0,
            maxTimestamp = 0,
            color = null;

        for (var i = 0; i < features.length; i++) {
            var properties = features[i].get('properties');
            if (properties.online) {
                clusterSize++;
            }
            if (properties.onOrbit) {
                color = FIS_ORBIT_COLOR;
            } else {
                if (color == null) {
                    var date = new Date(properties.lastActivity).getTime();
                    maxTimestamp = Math.max(maxTimestamp, date);
                }
            }
        }
        if (color == null) {
            color = self._starColor(maxTimestamp);
        }

        var clusterType = -1;
        if (clusterSize == 1) {
            clusterType = 1
        } else if (clusterSize > 1 && clusterSize < 5) {
            clusterType = 2;
        } else if (clusterSize >= 5 && clusterSize < 10) {
            clusterType = 3;
        } else if (clusterSize >= 10 && clusterSize < 15) {
            clusterType = 4;
        } else if (clusterSize >= 15) {
            clusterType = 5;
        }


        var styleName = "style-" + clusterType + "-" + color;
        var style = OnlineMap._clusterStyleCache[styleName];
        if (!style) {
            if (clusterType != -1) {
                var style = [new ol.style.Style({
                    image: new ol.style.Star({
                        type: clusterType,
                        fill: new ol.style.Fill({
                            color: color
                        })
                    })
                })];
                OnlineMap._clusterStyleCache[styleName] = style;
            }
        }
        return style;

    },

    _starColor: function (lastActivity) {
        var self = this;
        if (!self._currentOrbitTimestamps || self._issPositionIndex == undefined || self._issPositionIndex == -1) {
            return 'white';
        }
        var currentTimestamp = self._currentOrbitTimestamps[self._issPositionIndex];

        var diff = currentTimestamp - new Date(lastActivity).getTime();

        if (diff < 2 * 60 * 1000) {
            return FIS_TIME_COLORS[0];
        } else if (diff >= 2 * 60 * 1000 && diff <= 5 * 60 * 1000) {
            return FIS_TIME_COLORS[1];
        } else if (diff >= 5 * 1000 * 60 && diff <= 10 * 60 * 1000) {
            return FIS_TIME_COLORS[2];
        } else if (diff >= 10 * 60 * 1000 && diff <= 20 * 60 * 1000) {
            return FIS_TIME_COLORS[3];
        } else if (diff >= 20 * 60 * 1000) {
            return FIS_TIME_COLORS[4];
        }

    },

    _getStarColor: function (features) {
        var self = this;
        var maxTimestamp = 0;
        if (features == null || features.length == 0) {
            return FIS_TIME_COLORS[0];
        }
        for (var i = 0; i < features.length; i++) {
            var properties = features[i].get('properties');
            if (properties.onOrbit) {
                return FIS_ORBIT_COLOR;
            } else {
                var date = new Date(properties.lastActivity).getTime();
                maxTimestamp = Math.max(maxTimestamp, date);
            }
        }
        return self._starColor(maxTimestamp);

    },

    _greetingsStyling: function (feature, resolution) {


        if (feature == undefined || feature.get('features') == undefined) {
            console.error("feature undefined", feature);
            return;
        }

        var features = feature.get('features');
        var size = features.length;
        var notOnOrbit = true;
        var distance = 100;


        for (var i = 0; i < size; i++) {
            var properties = features[i].get('properties');
            if (properties.onOrbit && properties.samGreetingsDist != null) {
                notOnOrbit = false;
                distance = Math.min(distance, properties.samGreetingsDist);
            }
        }

        if (notOnOrbit) {
            return;
        }
        distance = (100 - distance);
        var greetingDist = 0;
        if (distance < 10) {
            greetingDist = 10;
        } else if (distance >= 10 && distance < 40) {
            greetingDist = 15;
        } else if (distance >= 40 && distance < 60) {
            greetingDist = 20;
        } else if (distance >= 60 && distance < 70) {
            greetingDist = 30;
        } else if (distance >= 70 && distance < 80) {
            greetingDist = 45;
        } else if (distance >= 80 && distance < 90) {
            greetingDist = 80;
        } else if (distance >= 90) {
            greetingDist = 120;
        }


        var cacheName = greetingDist + "-" + size;
        var style = OnlineMap._greetingsStyleCache[cacheName];
        if (!style) {

            var style = [new ol.style.Style({
                image: new ol.style.Circle({
                    radius: greetingDist,
                    fill: new ol.style.Fill({
                        color: FIS_ORBIT_COLOR
                    })
                })
            })];
            OnlineMap._greetingsStyleCache[cacheName] = style;
        }
        return style;

    },


    // ================================================================================
    // ===============================    CONSTELLATION     ===========================
    // ================================================================================
    updateConstellation: function () {
        var self = this;

        var maxConnProbability = 0.6,
            maxConnections = 3,
            maxDistance = 600000; //in meters depend on zoom


        self._constellationLayer.getSource().clear();


        if (self._usersClusterLayer != undefined) {

            var stars = [];
            var features = self._usersClusterLayer.getSource().getFeatures();
            if (features.length < 2) {
                return;
            }

            for (var i = 0; i < features.length; i++) {
                var f = features[i].getGeometry().getCoordinates();
                var coords = new ol.geom.Point(f).transform('EPSG:3857', 'EPSG:4326').getCoordinates();
                stars.push({
                    coords: coords,
                    connections: 0,
                    connProbability: Math.random() * 0.5
                });
            }
            var onCurrentPlane = function (a, b) {
                var a1 = a + 180;
                var b1 = b + 180;
                if (a1 < b1) {
                    return b1 - a1 <= 180;
                } else {
                    return a1 - b1 <= 180;
                }
            };

            for (var i = 0; i < stars.length; i++) {
                var starA = stars[i];

                for (var x = 0; x < stars.length; x++) {
                    var starB = stars[x];

                    var distance = self._haversineDistance(starA.coords, starB.coords);

                    if (distance < 5000000
                        && (starA.connProbability + starB.connProbability) < maxConnProbability
                        && starA.connections < maxConnections
                        && starB.connections < maxConnections
                        && onCurrentPlane(starA.coords[0], starB.coords[0])) { //less than 5000km
                        starA.connections++;
                        starB.connections++;


                        var feature = new ol.Feature({
                            geometry: new ol.geom.LineString([starA.coords, starB.coords]).transform('EPSG:4326', 'EPSG:3857')
                        });

                        self._constellationLayer.getSource().addFeature(feature);

                    }

                }
            }
        }


    },
    _getHorizon: function (altitudeMeters) {
        var r = 6378137 * 0.8;
        return r * Math.acos(r / (r + altitudeMeters));
    },
    _haversineDistance: function(c1, c2) {
        var self = this;
        var lat1 = self._toRadians(c1[1]);
        var lat2 = self._toRadians(c2[1]);
        var deltaLatBy2 = (lat2 - lat1) / 2;
        var deltaLonBy2 = self._toRadians(c2[0] - c1[0]) / 2;
        var a = Math.sin(deltaLatBy2) * Math.sin(deltaLatBy2) +
            Math.sin(deltaLonBy2) * Math.sin(deltaLonBy2) *
            Math.cos(lat1) * Math.cos(lat2);
        return 2 * 6378137 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    _toRadians: function(degree){
        return degree * (Math.PI/180);
    },


    // ================================================================================
    // ===============================       POPUPS         ===========================
    // ================================================================================
    popupClusterShow: function (coords, features) {
        var self = this;
        //hide single marker if visible
        self._dom.singleMarkerPopup.hide();
        var clusterSize = self._countNonGhostFeatures(features);

        //setup cluster marker text
        self._dom.clusterMarkerPopup.find('.people').text(clusterSize);
        self._dom.clusterMarkerPopup.find('.location').text(self.formatCoords(coords));
        //show marker popup
        self._dom.clusterMarkerPopup.show();

    },

    popupSingleShow: function (user, feature) {
        var self = this;
        //hide cluster marker if visible
        self._dom.clusterMarkerPopup.hide();
        self.updatePopupBorder();
        //setup single marker text
        var coordinates = feature.getGeometry().getCoordinates();
        var location = ol.proj.transform(coordinates, "EPSG:3857", "EPSG:4326");

        Meteor.call('getUser', user.userId, function (err, userData) {

            if (userData && userData.profile) {
                self._dom.singleMarkerPopup.removeClass('guest-popup');
                self._dom.singleMarkerPopup.find('.user-name').text(userData.profile.name);
                var imageUrl = userData.profile.profileImage;
                self._dom.singleMarkerPopup.find('.image').show();
                self._dom.singleMarkerPopup.find('.image').css('background-image', 'url(' + imageUrl + ')');

                self._dom.singleMarkerPopup.find('.sam-orbits-number').text(userData.profile.onOrbit ? userData.profile.onOrbit.length : 0);
                self._dom.singleMarkerPopup.find('.connected-people').show();
                if (userData.profile.friends) {
                    self._dom.singleMarkerPopup.find('.connected-people-number').text(userData.profile.friends ? userData.profile.friends.length : 0);
                } else {
                    self._dom.singleMarkerPopup.find('.connected-people-number').text(0);
                }


                if (userData.profile.service == 'twitter') {
                    var urls = [
                        "text=Hello @" + userData.profile.twitterScreenName + " ! We shared an orbit on",
                        "url=http://www.friendsinspace.org",
                        "hashtags=friendsinspace"
                    ];

                    var url = "https://twitter.com/intent/tweet?" + urls.join("&") + "&";

                    self._dom.singleMarkerPopup.find('.interactions.tweet').attr('href', url);
                    self._dom.singleMarkerPopup.find('.interactions.twitter-account').attr('href', userData.profile.profileLink);
                    self._dom.singleMarkerPopup.find('.twitter-interactions').show();
                    self._dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                    self._dom.singleMarkerPopup.find('.facebook-interactions').hide();
                } else if (userData.profile.service == 'google') {

                    self._dom.singleMarkerPopup.find('.interactions.google-plus-account').attr('href', userData.profile.profileLink);
                    self._dom.singleMarkerPopup.find('.twitter-interactions').hide();
                    self._dom.singleMarkerPopup.find('.google-plus-interactions').show();
                    self._dom.singleMarkerPopup.find('.facebook-interactions').hide();
                } else if (userData.profile.service == 'facebook') {

                    self._dom.singleMarkerPopup.find('.interactions.facebook-account').attr('href', userData.profile.profileLink);
                    self._dom.singleMarkerPopup.find('.twitter-interactions').hide();
                    self._dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                    self._dom.singleMarkerPopup.find('.facebook-interactions').show();
                } else {
                    self._dom.singleMarkerPopup.find('.interactions').hide();
                    self._dom.singleMarkerPopup.find('.twitter-interactions').hide();
                    self._dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                    self._dom.singleMarkerPopup.find('.facebook-interactions').hide();
                }


            } else {
                self._dom.singleMarkerPopup.addClass('guest-popup');
                self._dom.singleMarkerPopup.find('.user-name').text("user #" + user.userId.slice(0, 4));

            }

            self._dom.singleMarkerPopup.find('.user-location').text(self.formatCoords(location));
            //show marker popup
            self._dom.singleMarkerPopup.show();
        });


    },

    hideFeatureInfo: function () {
        var self = this;
        self._dom.clusterMarkerPopup.hide();
        if (!self._overlayPersistent) {
            self._dom.singleMarkerPopup.hide();
            self._overlayFeatureId = undefined;
            self._overlayFeatureType = undefined;
        }

        self._dom.map.css('cursor', 'auto');
    },
    updatePopupBorder: function () {
        var self = this;



        if (self._overlayPersistent && self._overlayFeatureType == 'user') {
            self._dom.singleMarkerPopup.css('border', '1px solid #879299');
            if(Meteor.user() == null){
                self._dom.singleMarkerPopup.find('.not-logged-in-notice').show();
            }else{
                self._dom.singleMarkerPopup.find('.not-logged-in-notice').hide();
                self._dom.singleMarkerPopup.find('.actions').show();
            }
        }
        else {
            self._dom.singleMarkerPopup.css('border', '1px solid rgba(0,0,0,0)');
            self._dom.singleMarkerPopup.find('.actions').hide();
            self._dom.singleMarkerPopup.find('.not-logged-in-notice').hide();
        }
    },

    displayFeatureInfo: function (pixel) {
        var self = this;

        var hoveredFeatures = self._map.forEachFeatureAtPixel(pixel, function (feature, layer) {
            if (layer == self._usersClusterLayer)
                return feature;
            return null;
        });


        if (hoveredFeatures == undefined) {
            return self.hideFeatureInfo();
        }


        var features = hoveredFeatures.get('features');

        if (features == undefined || features[0] == undefined) {
            return self.hideFeatureInfo();
        }
        var featureCount = self._countNonGhostFeatures(features);


        if (featureCount > 1) {
            //Cluster marker

            var coordinates = hoveredFeatures.getGeometry().getCoordinates();
            self._clusterOverlayPopup.setPosition(coordinates);

            // Update overlay label
            self.popupClusterShow(ol.proj.transform(coordinates, "EPSG:3857", "EPSG:4326"), features);
            self._dom.map.css('cursor', 'pointer');


        } else if (featureCount == 1) { //single feature

            var feature = self._getNonGhostFeatures(features)[0];

            if (feature.get('type') == 'user') {

                var user = feature.get('properties');
                self._overlayFeatureType = user.type;

                if (self._overlayFeatureId == user.userId) {
                    //already shown
                    return;
                } else {
                    self._overlayPersistent = false;
                    self.updatePopupBorder();
                }
                self._overlayFeatureId = user.userId;

                var marker = features[0];

                self._singleOverlayPopup.setPosition(marker.getGeometry().getCoordinates());

                self.popupSingleShow(user, marker);

                self._dom.map.css('cursor', 'pointer');
            } else {
                return self.hideFeatureInfo();
            }
        } else {
            return self.hideFeatureInfo();
        }


    },

    // ================================================================================
    // ===========================       GREETINGS  CIRCLES       =====================
    // ================================================================================

    findSamDistance: function () {
        var self = this;
        if (Session.get(FIS.KEYS.USER) == null) {
            console.error("User not present in session");
            return;
        }
        var userId = Session.get(FIS.KEYS.USER).userId;
        var userFeature = self._findUserFeature(userId);
        var orbitFeature = self._fullOrbitLayer.getSource().getFeatures()[0];

        var closestPoint = orbitFeature.getGeometry().getClosestPoint(userFeature.getGeometry().getCoordinates());

        var prev = self._currentOrbitCoordinates[0];

        var userIndex = -1;
        for (var i = 0; i < self._currentOrbitCoordinates.length; i++) {
            var c = self._currentOrbitCoordinates[i];
            if (prev[0] <= closestPoint[0] && c[0] > closestPoint[0]) {
                userIndex = i;
                break;
            } else {
                prev = c;
            }
        }

        if (userIndex == -1) {
            console.error("can't find user on orbit...why?");
            return;
        }
        var diff = Math.abs(userIndex - self._issPositionIndex);

        return Math.floor(diff / self._currentOrbitCoordinates.length * 100);

    },
    findMyDistance: function () {
        var self = this;
        if (Session.get(FIS.KEYS.USER) == null) {
            console.error("User not present in session");
            return;
        }
        if (self._fullOrbitLayer == null) {
            return;
        }
        var userId = Session.get(FIS.KEYS.USER).userId;
        var userFeature = self._findUserFeature(userId);
        var orbitFeature = self._fullOrbitLayer.getSource().getFeatures()[0];
        if (orbitFeature == null || userFeature == null) {
            return;
        }
        var closestPoint = orbitFeature.getGeometry().getClosestPoint(userFeature.getGeometry().getCoordinates());

        var prev = self._currentOrbitCoordinates[0];

        var userIndex = -1;
        for (var i = 0; i < self._currentOrbitCoordinates.length; i++) {
            var c = self._currentOrbitCoordinates[i];
            if (prev[0] <= closestPoint[0] && c[0] > closestPoint[0]) {
                userIndex = i;
                break;
            } else {
                prev = c;
            }
        }

        if (userIndex == -1) {
            console.error("can't find user on orbit...why?");
            return;
        }

        return Math.floor(userIndex / self._currentOrbitCoordinates.length * 100);

    },
    findSamAndMeTimeDistance: function () {
        var self = this;
        if (Session.get(FIS.KEYS.USER) == null) {
            console.error("User not present in session");
            return;
        }
        if (self._fullOrbitLayer == null) {
            return;
        }
        var userId = Session.get(FIS.KEYS.USER).userId;
        var userFeature = self._findUserFeature(userId);
        var orbitFeature = self._fullOrbitLayer.getSource().getFeatures()[0];
        if (orbitFeature == null || userFeature == null) {
            return;
        }
        var closestPoint = orbitFeature.getGeometry().getClosestPoint(userFeature.getGeometry().getCoordinates());

        var prev = self._currentOrbitCoordinates[0];

        var userIndex = -1;
        for (var i = 0; i < self._currentOrbitCoordinates.length; i++) {
            var c = self._currentOrbitCoordinates[i];
            if (prev[0] <= closestPoint[0] && c[0] > closestPoint[0]) {
                userIndex = i;
                break;
            } else {
                prev = c;
            }
        }

        if (userIndex == -1) {
            console.error("can't find user on orbit...why?");
            return;
        }

        var samTime = self._currentOrbitTimestamps[self._issPositionIndex];
        var userTime = self._currentOrbitTimestamps[userIndex];
        var distanceTime = userTime - samTime;

        return distanceTime;
    },
    _findUserCluster: function (userId) {
        var self = this;
        var clusterMarkers = self._usersClusterLayer.getSource().getFeatures();
        for (var i = 0; i < clusterMarkers.length; i++) {
            var cluster = clusterMarkers[i];
            var clusterFeatures = cluster.get('features');

            for (var f = 0; f < clusterFeatures.length; f++) {
                var feature = clusterFeatures[f];
                if (feature.getId() == userId) {
                    return clusterMarkers[i];
                }
            }

        }
        return null;
    },
    displayGreetings: function (user, isSamGreetings) {
        var self = this;
        var userFeature = self._findUserFeature(user.userId);
        if (userFeature != null) {

            var userCluster = self._findUserCluster(user.userId);

            if (userCluster != null) {

                var coords = userCluster.getGeometry().getCoordinates();
                var elem = document.createElement('div');
                var classes = 'star-hi' + (isSamGreetings ? ' star-hi-sam' : '');
                elem.setAttribute('class', classes);
                var overlay = new ol.Overlay({
                    element: elem,
                    position: coords,
                    positioning: 'center-center'
                });
                self._map.addOverlay(overlay);
                setTimeout(function () {
                    if (self._map != null)
                        self._map.removeOverlay(overlay);
                }, 2000);
            } else {
                console.error('can\'t find cluster for user', user);
            }
        } else {
            console.error('user not on the map', user);
        }
    },


    _samGreetingsOverlay: undefined,

    addCurrentSamGreeting: function (samGreetings) {
        var self = this;
        var coords = self._currentOrbitCoordinates[self._issPositionIndex];

        if (self._samGreetingsOverlay) { //only one sam overlay at time
            self._map.removeOverlay(self._samGreetingsOverlay);
            self._samGreetingsOverlay = null;
        }
        self._samGreetingsOverlay = new ol.Overlay({
            element: self._samGreetingsCircleElement,
            positioning: 'center-center',
            position: coords
        });
        self._map.addOverlay(self._samGreetingsOverlay);

    },
    updateCurrentSamGreeting: function (samGreetings) {
        var self = this;
        self.addCurrentSamGreeting(samGreetings);
    },
    removeCurrentSamGreeting: function (samGreetings) {
        var self = this;
        if (self._samGreetingsOverlay) {
            self._map.removeOverlay(self._samGreetingsOverlay);
            self._samGreetingsOverlay = null;
        }

    },


    highlightUser: function (user) {
        var self = this;
        var userFeature = self._findUserFeature(user.userId);
        if (userFeature != null) {

            var feature = self._findUserCluster(user.userId);

            if (feature != null) {
                var coords = feature.getGeometry().getCoordinates();

                if (self._highlightedUser == undefined) {
                    var elem = document.createElement('div');
                    elem.setAttribute('id', 'star-highlight-element');
                    elem.setAttribute('class', 'star-highlight');
                    self._highlightedUser = new ol.Overlay({
                        element: elem,
                        position: coords,
                        positioning: 'center-center'
                    });
                    self._map.addOverlay(self._highlightedUser);
                } else {
                    self._highlightedUser.setPosition(coords);
                }

                $('#star-highlight-element').fadeIn();

            } else {
                console.error('can\'t find cluster for user', user);
            }
        } else {
            console.error('user not on the map', user);
        }
    },
    deHighlightUser: function () {
        var self = this;
        if (self._highlightedUser != undefined) {
            $('#star-highlight-element').fadeOut();
        }
    },
    highlightSam: function () {
        var self = this;


        var features = self._issPositionLayer.getSource().getFeatures();
        features[1].setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 1
            })
        }));


    },
    deHighlightSam: function () {
        var self = this;
        var features = self._issPositionLayer.getSource().getFeatures();
        features[1].setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 0.5
            })
        }));
    },

    // ================================================================================
    // =========================       GREETINGS LINKS         ========================
    // ================================================================================

    _startGreetingsLinkDrawer: function () {
        var self = this;
        self._map.on('postcompose', self._greetingsLinkHandler, self);
        self._greetingsHandlerStarted = true;
    },
    _stopGreetingsLinkDrawer: function () {
        var self = this;
        self._map.un('postcompose', self._greetingsLinkHandler, self);
        self._greetingsHandlerStarted = false;
    },

    _greetingsLinkHandler: function (event) {
        var self = this;
        if (self._greetingsLinkQueue.length == 0) {
            self._stopGreetingsLinkDrawer();
            return;
        }

        var vectorContext = event.vectorContext;


        for (var index in self._greetingsLinkQueue) {
            var link = self._greetingsLinkQueue[index];

            var style = link.started ? self._greetingsLinkStyleStarted : self._greetingsLinkStyleReceived;
            vectorContext.setFillStrokeStyle(null, style);


            vectorContext.drawLineStringGeometry(
                new ol.geom.LineString(link.arc.slice(link.start, link.current)).transform('EPSG:4326', 'EPSG:3857'), null
            );
            if (link.current >= link.arc.length) {
                link.current = link.arc.length;
                link.start++;
            } else {
                link.current++;
            }
            if (link.start >= link.arc.length) {
                link.counter++;
                link.current = 0;
                link.start = 0;
            }


        }
        var len = self._greetingsLinkQueue.length;
        while (len--) {
            var link = self._greetingsLinkQueue[len];
            if (link.counter >= 1) {
                self._greetingsLinkQueue.splice(len, 1);
            }
        }

        self._map.render();

    },

    createGreetingsLink: function (startUserId, endUserId, started) {
        var self = this;

        var startFeature = self._findUserCluster(startUserId);
        var endFeature = self._findUserCluster(endUserId);
        if (startFeature == null || endFeature == null) {
            return;
        }

        var startCoords = ol.proj.transform(startFeature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');
        var endCoords = ol.proj.transform(endFeature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');

        var arcGenerator = new ArcJs.GreatCircle({x: (startCoords[0] + 180) / 2, y: startCoords[1]}, {x: (endCoords[0] + 180) / 2, y: endCoords[1]});
        var link = arcGenerator.Arc(50, {offset: 1}).geometries[0].coords;

        for (var i = 0; i < link.length; i++) {
            link[i][0] = (link[i][0] * 2) - 180;
        }

        self._greetingsLinkQueue.push({arc: link, counter: 0, start: 0, current: 0, started: started});
        if (!self._greetingsHandlerStarted) {
            self._startGreetingsLinkDrawer();
        }

    },

    // ================================================================================
    // =========================       UTILS         ==================================
    // ================================================================================

    formatCoords: function (coords) {
        var lng = coords[0] > 0 ? coords[0].toFixed(2) + "°E" : -coords[0].toFixed(2) + "°W";
        var lat = coords[1] > 0 ? coords[1].toFixed(2) + "°N" : -coords[1].toFixed(2) + "°S";
        return lng + " / " + lat;

    }

};