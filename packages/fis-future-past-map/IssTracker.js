// ================================================================================
// CONSTRUCTOR
// ================================================================================
IssTracker = function (trackerContainerId, trackerViewType) {

    var self = this;

    this.dom = {
        container: $('#' + trackerContainerId)
    };

    this.config = {

        trackerViewFutureClass: 'view-future',
        trackerViewPastClass: 'view-past',

        trackerIntervalTimeout: 3500,

        trackerHeight: 600,

        defaultTrackerViewType: IssTracker.VIEW_FUTURE,
        //mapTileProvider: 'http://{a-d}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        mapTileProvider: 'https://a.tiles.mapbox.com/v3/accurat.k6o69p8d/{z}/{x}/{y}.png',
        mapZoomInitial: 4,
        mapZoomMin: 4,
        mapZoomMax: 7,

        orbitPathColor: 'yellow',
        orbitPathWidth: 1,
        orbitPathLineDash: [5, 10],

        bufferOrbitLowerBoundRatio: 1 / 6,
        bufferOrbitUpperBoundRatio: 5 / 6,

        timeLabelsModulo: 15,
        timeLabelsFutureOffset: -15,
        timeLabelsNegativeThreshold: -0.5,
        timeMainFormat: function (momentTimestamp) {
            return momentTimestamp.utc().format('DD MMMM YYYY, HH:mm');
        },
        timeLabelFormat: function (momentTimestamp) {
            return momentTimestamp.utc().format('HH:mm');
        },

        layerSlots: 3,

        markerBaseSizeSingle: 6,
        markerBaseSizeCluster: 15,
        markerColorOrbitIn: '#FFFF00',
        markerColorOrbitOut: '#8791CC',
        markerTextColor: '#000000',
        markerHoverStrokeColor: '#000000',
        markerHoverStrokeWidth: 6,

        markerPopupId: 'marker-popup',
        markerPopupClass: 'overlay',

        greetingsInternalColor: '#C0C0C0',
        greetingsInternalWidth: 1,
        greetingsExternalColor: '#C0C0C0',
        greetingsExternalWidth: 2,
        greetingsExternalOffset: 20,

        eventSpotSize: 8,
        eventSpotFillColor: '#FFFFFF',
        eventSpotStrokeColor: '#000000',
        eventSpotStrokeWidth: 4,

        eventIntervalStrokeWidth: 5


    };

    if (!trackerContainerId) throw new Error('unable to initialize without container id');
    if (!trackerViewType) trackerViewType = this.config.defaultTrackerViewType;

    this.trackerContainerId = trackerContainerId;
    this.trackerType = trackerViewType;

    this.trackerInterval = null;

    this.map = null;
    this.mapView = null;

    this.currentPosition = 0;
    this.issOrbit = new IssOrbit();

    this.orbits = {
        prev: null,
        current: null,
        next: null,
        buffer: null,
        lastFetched: null
    };


    var getAvailableSlotFunction = function (direction) {
        var prevDirection = this.lastUpdateDirection;
        this.lastUpdateDirection = direction;
        if (direction == IssTracker.DIRECTION_FORWARD) {
            if (this.lastUpdateSlot == -1) {
                this.lastUpdateSlot = 0;
                return this.lastUpdateSlot;
            } else {
                if (prevDirection == IssTracker.DIRECTION_FORWARD) {
                    var i = (this.lastUpdateSlot + 1) % self.config.layerSlots;
                    this.lastUpdateSlot = i;
                    return this.lastUpdateSlot;
                } else {
                    return this.lastUpdateSlot;
                }
            }
        } else if (direction == IssTracker.DIRECTION_BACKWARD) {
            if (this.lastUpdateSlot == -1) {
                this.lastUpdateSlot = self.config.layerSlots - 1;
                return this.lastUpdateSlot;
            } else {
                if (prevDirection == IssTracker.DIRECTION_BACKWARD) {
                    var i = (this.lastUpdateSlot - 1 + self.config.layerSlots) % self.config.layerSlots;
                    this.lastUpdateSlot = i;
                    return this.lastUpdateSlot;
                } else {
                    return this.lastUpdateSlot;
                }
            }
        }
    };

    this.orbitsLayer = {
        style: null,
        slots: [],
        lastUpdateSlot: -1,
        lastUpdateDirection: null,
        getAvailableSlot: getAvailableSlotFunction
    };

    this.markersLayer = {
        style: null,
        styleCache: null,
        slots: [],
        popup: undefined,
        lastUpdateSlot: -1,
        lastUpdateDirection: null,
        getAvailableSlot: getAvailableSlotFunction
    };

    this.eventsLayer = {
        interval: {
            style: null,
            styleCache: {},
            slots: [],
            lastUpdateSlot: -1,
            lastUpdateDirection: null,
            getAvailableSlot: getAvailableSlotFunction
        },
        spot: {
            style: null,
            styleCache: {},
            slots: [],
            popup: null,
            lastUpdateSlot: -1,
            lastUpdateDirection: null,
            getAvailableSlot: getAvailableSlotFunction
        }
    };

    this.greetingsLayer = {
        style: null,
        styleCache: null,
        slots: []
    };

    this.hoveredMarkers = {
        persistent: false,
        objects: [],
        styleCache: {
            onOrbit: {},
            outOrbit: {}
        }
    };

    // initialize slots
    for (var i = 0; i < this.config.layerSlots; i++) {

        this.orbitsLayer.slots.push({
            orbitId: null,
            object: null,
            source: null,
            features: null
        });

        this.markersLayer.slots.push({
            orbitId: null,
            object: null,
            source: null,
            cluster: null,
            features: null
        });

        this.eventsLayer.interval.slots.push({
            orbitId: null,
            object: null,
            source: null,
            features: null
        });

        this.eventsLayer.spot.slots.push({
            orbitId: null,
            object: null,
            source: null,
            features: null
        });

        this.greetingsLayer.slots.push({
            object: null
        });

    }
};
// ================================================================================
// CONSTANTS
// ================================================================================
IssTracker.MAP_LATLON = 'EPSG:4326';
IssTracker.MAP_METRIC = 'EPSG:3857';

IssTracker.VIEW_PAST = 'map-past';
IssTracker.VIEW_FUTURE = 'map-future';

IssTracker.DIRECTION_FORWARD = 'forward';
IssTracker.DIRECTION_BACKWARD = 'backward';

IssTracker.LAYER_ORBITS = 'layer-orbits';
IssTracker.LAYER_MARKERS = 'layer-markers';
IssTracker.LAYER_GREETINGS = 'layer-greetings';
IssTracker.LAYER_EVENTS_INTERVAL = 'layer-events-interval';
IssTracker.LAYER_EVENTS_SPOT = 'layer-events-spot';


// ================================================================================
// INITIALIZATION
// ================================================================================
IssTracker.prototype.initialize = function () {

    var self = this;

    this.nextPosition = function () {

        var nextTimestamp;
        if (self.currentPosition + 1 >= self.orbits.current.coordinates.length) {
            nextTimestamp = self.orbits.next.timestamps[0];
        } else {
            nextTimestamp = self.orbits.current.timestamps[self.currentPosition + 1];
        }

        if (self.trackerType == IssTracker.VIEW_FUTURE || (self.trackerType == IssTracker.VIEW_PAST && !nextTimestamp.isAfter(moment.utc()))) {
            self.currentPosition++;
            self.fetchBufferOrbit(IssTracker.DIRECTION_FORWARD);
            if (self.currentPosition >= self.orbits.current.coordinates.length) {
                self.currentPosition = 0;
                self.orbits.prev = self.orbits.current;
                self.orbits.current = self.orbits.next;
                self.orbits.next = self.orbits.buffer;
                self.orbits.buffer = null;
                self.orbits.lastFetched = null;
                self.updateOrbitsLayer(IssTracker.DIRECTION_FORWARD);
                self.updateMarkersLayer(IssTracker.DIRECTION_FORWARD);
                self.updateEventsIntervalLayer(IssTracker.DIRECTION_FORWARD);
                self.updateEventsSpotLayer(IssTracker.DIRECTION_FORWARD);
                self.map.renderSync();
            }

            self.scrollMap();

        }
    };

    this.prevPosition = function () {

        var prevTimestamp;
        if (self.currentPosition - 1 >= 0) {
            prevTimestamp = self.orbits.current.timestamps[self.currentPosition - 1];
        } else {
            prevTimestamp = self.orbits.prev.timestamps[self.orbits.prev.timestamps.length - 1];
        }

        if (self.trackerType == IssTracker.VIEW_PAST || (self.trackerType == IssTracker.VIEW_FUTURE && !prevTimestamp.isBefore(moment.utc()))) {
            self.currentPosition--;
            self.fetchBufferOrbit(IssTracker.DIRECTION_BACKWARD);
            if (self.currentPosition < 0) {
                self.orbits.next = self.orbits.current;
                self.orbits.current = self.orbits.prev;
                self.orbits.prev = self.orbits.buffer;
                self.orbits.buffer = null;
                self.currentPosition = self.orbits.current.coordinates.length - 1;
                self.orbits.lastFetched = null;
                self.updateOrbitsLayer(IssTracker.DIRECTION_BACKWARD);
                self.updateMarkersLayer(IssTracker.DIRECTION_BACKWARD);
                self.updateEventsIntervalLayer(IssTracker.DIRECTION_BACKWARD);
                self.updateEventsSpotLayer(IssTracker.DIRECTION_BACKWARD);
                self.map.renderSync();
            }

            self.scrollMap();
        }
    };

    this.setupOrbitsData();

    this.currentPosition = this.issOrbit.getCurrentIndexInOrbit(this.orbits.current);

    this.mapView = new ol.View({
        center: this.projectCoords([this.orbits.current.coordinates[this.currentPosition][0], this.orbits.current.coordinates[this.currentPosition][1]]),
        zoom: this.config.mapZoomInitial,
        minZoom: this.config.mapZoomMin,
        maxZoom: this.config.mapZoomMax,
        rotation: this.getRotationAngle()
    });

    this.setupEventsIntervalLayer();

    this.setupEventsSpotLayer();

    this.setupOrbitsLayer();

    this.setupMarkersLayer();

    this.setupGreetingsLayer();

    this.setupDOM();

    var mouseWheelPan = new ol.interaction.MouseWheelPan({
        duration: 500,
        scrollUpCallback: this.nextPosition,
        scrollDownCallback: this.prevPosition
    });

    this.map = new ol.Map({
        target: self.dom.map[0],
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM({
                    url: this.config.mapTileProvider
                })
            }),
            this.eventsLayer.interval.slots[0].object,
            this.eventsLayer.interval.slots[1].object,
            this.eventsLayer.interval.slots[2].object,
            this.orbitsLayer.slots[0].object,
            this.orbitsLayer.slots[1].object,
            this.orbitsLayer.slots[2].object,
            this.eventsLayer.spot.slots[0].object,
            this.eventsLayer.spot.slots[1].object,
            this.eventsLayer.spot.slots[2].object,
            this.greetingsLayer.slots[0].object,
            this.greetingsLayer.slots[1].object,
            this.greetingsLayer.slots[2].object,
            this.markersLayer.slots[0].object,
            this.markersLayer.slots[1].object,
            this.markersLayer.slots[2].object
        ],
        view: this.mapView,
        interactions: ol.interaction.defaults({
            mouseWheelZoom: false,
            doubleClickZoom: false,
            dragPan: false
        }).extend([mouseWheelPan])
    });

    //popup overlays
    this.markersLayer.singleMarkerPopup = new ol.Overlay({
        element: self.dom.singleMarkerPopup,
        positioning: 'top-right'
    });
    this.markersLayer.clusterMarkerPopup = new ol.Overlay({
        element: self.dom.clusterMarkerPopup,
        positioning: 'top-right'
    });

    this.eventsLayer.eventsSpotPopup = new ol.Overlay({
        element: self.dom.eventsSpotPopup,
        positioning: 'center-right'
    });


    this.map.addOverlay(this.markersLayer.singleMarkerPopup);
    this.map.addOverlay(this.markersLayer.clusterMarkerPopup);
    this.map.addOverlay(this.eventsLayer.eventsSpotPopup);

    this.map.on('moveend', function () {
        self.updateTimeLabels();
    });
    self.updateSize();

    $(this.map.getViewport()).on('mousemove', function (evt) {
        var pixel = self.map.getEventPixel(evt.originalEvent);
        self.handleFeatureMouseOver(pixel);
    });

    $(this.map.getViewport()).on('click', function (evt) {
        if (self.hoveredMarkers.objects.length > 0) {
            self.hoveredMarkers.persistent = true;
            self.updatePopupBorder();
        } else if (self.hoveredMarkers.persistent) {
            self.hoveredMarkers.persistent = false;
            self.updatePopupBorder();
            self.hidePopups();
        }
    });

    var cartoDBmapConfig = {
        "version": "1.0.1",
        "layers": [{
            "type": "cartodb",
            "options": {
                "cartocss_version": "2.1.1",
                "cartocss": "#friends_in_space{marker-fill-opacity: 0.3;marker-line-color: #acacac;marker-line-width: 0.4;marker-line-opacity: 0.8;marker-placement: point;marker-type: ellipse;marker-width: 4.5;marker-fill: #acacac;marker-allow-overlap: true;}",
                "sql": "select * from friends_in_space"
            }
        }]
    };

    $.ajax({
        crossOrigin: true,
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        url: 'http://friendsinspace.cartodb.com/api/v1/map?api_key=3b200aa9a5def8e9b17cae6f8babf2d3bd9e563b',
        data: JSON.stringify(cartoDBmapConfig),
        success: function(data) {
            var templateUrl = 'http://friendsinspace.cartodb.com/api/v1/map/' + data.layergroupid + '/{z}/{x}/{y}.png';
            var cartoDBTile = new ol.layer.Tile({
                source:new ol.source.OSM({
                    url: templateUrl
                })
            });
            self.map.getLayers().insertAt(1,cartoDBTile);
        }
    })

};

IssTracker.prototype.destroy = function(){
    var self = this;
    self.disableAutomaticScroll();
    self.map.setTarget();
    self.map = null;
    self.markersLayer = null;
    self.eventsLayer = null;
    self.orbitsLayer = null;
    self.greetingsLayer = null;
    self.currentPosition = null;
    self.issOrbit = null;
};



IssTracker.prototype.setupDOM = function () {
    var self = this;

    self.dom.map = self.dom.container.find('.map');
    //TODO FIND A BETTER WAY TO SPECIFY HTML HERE
    self.dom.singleMarkerPopup = $('<div class="single-marker-popup"><div class="image"></div><div class="user"><span class="user-name"></span> &#8213; <span class="user-location"></span></div><div class="statistics"><span class="sam-orbits"><span class="sam-orbits-number"></span> ORBITS WITH SAM</span> / <span class="connected-people"><span class="connected-people-number"></span> FRIENDS IN SPACE</span></div><div class="not-logged-in-notice">log in for more features</div><div class="actions"><span class="popup-action"><a class="interactions user-interactions"><span>See Activity</span></a></span><span class="twitter-interactions"><span class="popup-action"><a class="interactions tweet" href="" onclick="window.open(this.href, \'mywin\',\'left=20,top=20,width=500,height=500,toolbar=1,resizable=0\'); return false;">Tweet</a></span><span class="popup-action"><a class="interactions twitter-account" href="" target="_blank">Twitter profile</a></span></span><span class="google-plus-interactions"><span class="popup-action"><a class="interactions google-plus-account" href="" target="_blank">Google+ profile</a></span></span><span class="facebook-interactions"><span class="popup-action"><a class="interactions facebook-account" href="" target="_blank">Facebook profile</a></span></span></div></div>')
    self.dom.clusterMarkerPopup = $('<div class="cluster-marker-popup"><span class="text"><span class="people"></span> PEOPLE</span> &#8213; <span class="location"></span></div>');
    self.dom.eventsSpotPopup = $('<div class="event-spot-popup"><span class="description"></span> - <span class="person"></span></div>');
    self.dom.currentView = self.dom.container.find('.current-view');
    self.dom.currentTime = self.dom.container.find('.current-time');
    self.dom.timeLabels = self.dom.container.find('.time-labels');

    //setup styles
    self.dom.container.css('height', window.innerHeight - 40);


    var mapContainerStyle;
    if (this.trackerType == IssTracker.VIEW_FUTURE) {
        mapContainerStyle = 0;
        self.dom.currentView.text('FUTURE');
        self.dom.container.find('.ol-rotate').css('top',10);
    } else if (this.trackerType == IssTracker.VIEW_PAST) {
        mapContainerStyle = -(window.innerHeight - 40);
        self.dom.currentView.text('PAST');
        self.dom.container.find('.ol-rotate').css('top',(window.innerHeight -30));
    }

    self.dom.map.css({top: mapContainerStyle, height: 2 * (window.innerHeight - 40)});

    self.config.trackerHeight = window.innerHeight - 40;

    $(window).resize(function () {
        self.updateSize();
    });

};

IssTracker.prototype.zoomOut = function () {
    var self = this;
    self.zoomByDelta(-1);
};

IssTracker.prototype.zoomIn = function () {
    var self = this;
    self.zoomByDelta(1);
};

IssTracker.prototype.zoomByDelta = function (delta) {
    var self = this;
    var view = self.map.getView();
    if (view == null) {
        // the map does not have a view, so we can't act
        // upon it
        return;
    }
    var currentResolution = view.getResolution();
    if (currentResolution != undefined) {

        self.map.beforeRender(ol.animation.zoom({
            resolution: currentResolution,
            duration: 250,
            easing: ol.easing.easeOut
        }));
        var newResolution = view.constrainResolution(currentResolution, delta);
        view.setResolution(newResolution);
    }
};

IssTracker.prototype.updateSize = function () {
    var self = this;
    self.dom.container.css('height', window.innerHeight - 40);
    self.config.trackerHeight = window.innerHeight - 40;

    var mapContainerStyle;
    if (self.trackerType == IssTracker.VIEW_FUTURE) {
        mapContainerStyle = 0;
        self.dom.currentView.text('FUTURE');
        self.dom.container.find('.ol-rotate').css('top',10);
    } else if (self.trackerType == IssTracker.VIEW_PAST) {
        mapContainerStyle = -(window.innerHeight - 40);
        self.dom.currentView.text('PAST');
        self.dom.container.find('.ol-rotate').css('top',(window.innerHeight - 30));
    }

    self.dom.map.css({top: mapContainerStyle, height: 2 * (window.innerHeight - 40)});

};

// initialization function for orbits data
IssTracker.prototype.setupOrbitsData = function () {
    var self = this;

    self.orbits.current = self.issOrbit.getOrbit(IssOrbit.ORBIT_CURRENT, null, null, function (dataType, orbitId, orbitData) {
        self.updateOrbitData(dataType, orbitId, orbitData);
    });
    self.orbits.prev = self.issOrbit.getOrbit(IssOrbit.ORBIT_PREV, self.orbits.current, null, function (dataType, orbitId, orbitData) {
        self.updateOrbitData(dataType, orbitId, orbitData);
    });
    self.orbits.next = self.issOrbit.getOrbit(IssOrbit.ORBIT_NEXT, self.orbits.current, null, function (dataType, orbitId, orbitData) {
        self.updateOrbitData(dataType, orbitId, orbitData);
    });
};

// updates the buffer orbit w.r.t. the current status and the user movement direction
IssTracker.prototype.fetchBufferOrbit = function (direction) {

    var self = this;

    var lowerBound = Math.floor(self.orbits.current.coordinates.length * self.config.bufferOrbitLowerBoundRatio);
    var upperBound = Math.floor(self.orbits.current.coordinates.length * self.config.bufferOrbitUpperBoundRatio);

    if (self.currentPosition > upperBound && self.orbits.lastFetched != IssOrbit.ORBIT_NEXT && direction == IssTracker.DIRECTION_FORWARD) {
        // if going forward and passing over upperBound of current orbit, prefetch two orbits forward
        self.orbits.buffer = self.issOrbit.getOrbit(IssOrbit.ORBIT_NEXT, self.orbits.next, null, function (dataType, orbitId, orbitData) {
            self.updateOrbitData(dataType, orbitId, orbitData);
        });
        self.orbits.lastFetched = IssOrbit.ORBIT_NEXT;
    } else if (self.currentPosition < lowerBound && self.orbits.lastFetched != IssOrbit.ORBIT_PREV && direction == IssTracker.DIRECTION_BACKWARD) {
        // if going backward and passing before lowerBound of current orbit, prefetch two orbits backward
        self.orbits.buffer = self.issOrbit.getOrbit(IssOrbit.ORBIT_PREV, self.orbits.prev, null, function (dataType, orbitId, orbitData) {
            self.updateOrbitData(dataType, orbitId, orbitData);
        });
        self.orbits.lastFetched = IssOrbit.ORBIT_PREV;
    }
};

// callback function to be called by IssOrbit after receiving orbit data from the remote server
IssTracker.prototype.updateOrbitData = function (dataType, orbitId, orbitData) {

    if (orbitId == undefined || orbitId == null ||
        orbitData == undefined || orbitData == null ||
        dataType == undefined || dataType == null) {
        return;
    }

    var self = this;
    var orbitToUpdate = self.getOrbitById(orbitId);
    if (orbitToUpdate != null) {
        if (dataType == IssOrbit.DATA_MARKERS) {
            orbitToUpdate.markers = orbitData;
            self.refreshMarkersLayer();
        } else if (dataType == IssOrbit.DATA_EVENTS_INTERVAL) {
            orbitToUpdate.eventsInterval = orbitData;
            self.refreshEventsIntervalLayer();
        } else if (dataType == IssOrbit.DATA_EVENTS_SPOT) {
            orbitToUpdate.eventsSpot = orbitData;
            self.refreshEventsSpotLayer();
        }
    }
};


// ================================================================================
// MAP ORIENTATION AND PAN
// ================================================================================
IssTracker.prototype.getRotationAngle = function () {

    var sourcePoint;
    if ((this.currentPosition - 1) >= 0) {
        sourcePoint = this.orbits.current.coordinates[this.currentPosition - 1];
    } else {
        sourcePoint = this.orbits.prev.coordinates[this.orbits.prev.coordinates.length - 1];
    }

    var targetPoint = this.orbits.current.coordinates[this.currentPosition];

    var sourcePointMetric = this.projectCoords(sourcePoint);
    var targetPointMetric = this.projectCoords(targetPoint);

    var sourceLat = sourcePointMetric[1];
    var sourceLon = sourcePointMetric[0];
    var targetLat = targetPointMetric[1];
    var targetLon = targetPointMetric[0];

    var m = (targetLat - sourceLat) / (targetLon - sourceLon);
    var atan_m = Math.atan(m);
    var rotationAngle = atan_m - (Math.PI / 2);

    // TODO: check correctness of tangent correction angle
    //var tangentCorrection = getTangentCorrection();

    return rotationAngle;// + tangentCorrection;
};

IssTracker.prototype.scrollMap = function () {

    var centerCoords = this.projectCoords([this.orbits.current.coordinates[this.currentPosition][0], this.orbits.current.coordinates[this.currentPosition][1]]);
    var rotationAngle = this.getRotationAngle();
    this.mapView.setCenter(centerCoords);
    this.mapView.rotate(rotationAngle);
};

IssTracker.prototype.enableAutomaticScroll = function () {

    var self = this;
    if (this.trackerInterval == null) {
        this.trackerInterval = setInterval(function () {
            self.updateCurrentPosition();
        }, this.config.trackerIntervalTimeout);
    }
};

IssTracker.prototype.disableAutomaticScroll = function () {
    if (this.trackerInterval != null) {
        clearInterval(this.trackerInterval);
        this.trackerInterval = null;
    }
};

IssTracker.prototype.updateCurrentPosition = function () {

    var now = moment.utc();

    var orbitOverflow = false;
    var expectedPosition = this.issOrbit.getIndexInOrbit(now, this.orbits.current);
    if (expectedPosition == -1) {
        orbitOverflow = true;
        expectedPosition = this.issOrbit.getIndexInOrbit(now, this.orbits.next);
    }

    if (expectedPosition != -1 && this.trackerType == IssTracker.VIEW_FUTURE) {
        this.scrollToPosition(expectedPosition, orbitOverflow);
    }
};

IssTracker.prototype.scrollToPosition = function (expectedPosition, orbitOverflow) {
    // only forward scrolling is enabled
    if (expectedPosition > this.currentPosition) {
        // compute how many coordinates to scroll ahead
        var coordinatesToScroll;
        if (!orbitOverflow) {
            coordinatesToScroll = expectedPosition - this.currentPosition;
        } else {
            coordinatesToScroll = this.orbits.current.coordinates.length - this.currentPosition + expectedPosition;
        }

        for (var i = 0; i < coordinatesToScroll; i++) {
            this.nextPosition();
        }
    }
};

// ================================================================================
// TIME LABELS
// ================================================================================

IssTracker.prototype.updateTimeLabels = function () {

    var self = this;
    var timestampsToDisplay = [];
    var displayTimestamp = true;
    var timestampIndex = self.currentPosition;
    var orbit = self.orbits.current;
    var index;

    while (displayTimestamp) {

        index = timestampIndex;

        if (self.trackerType == IssTracker.VIEW_FUTURE) {
            if (timestampIndex >= self.orbits.current.coordinates.length) {
                orbit = self.orbits.next;
                index = timestampIndex - self.orbits.current.coordinates.length;
            }

        } else if (self.trackerType == IssTracker.VIEW_PAST) {
            if (timestampIndex < 0) {
                orbit = self.orbits.prev;
                index = timestampIndex + self.orbits.prev.coordinates.length;
            }
        }

        var timestampOffset = self.map.getPixelFromCoordinate(self.projectCoords(orbit.coordinates[index]))[1];

        // adjust offset
        if (self.trackerType == IssTracker.VIEW_PAST) timestampOffset -= self.config.trackerHeight;
        else if (self.trackerType == IssTracker.VIEW_FUTURE) timestampOffset += self.config.timeLabelsFutureOffset;

        // need to check with negativeThreshold to avoid empty arrays in case that first timestamp offset is around 0px
        if (timestampOffset < self.config.timeLabelsNegativeThreshold || timestampOffset > self.config.trackerHeight) {
            // timestamp is outside of the visible map area; stop.
            displayTimestamp = false;
        } else {
            // timestamp has to be displayed
            timestampsToDisplay.push({value: orbit.timestamps[index], offset: timestampOffset});
            if (self.trackerType == IssTracker.VIEW_FUTURE)
                timestampIndex += self.config.timeLabelsModulo;
            else if (self.trackerType == IssTracker.VIEW_PAST)
                timestampIndex -= self.config.timeLabelsModulo;
        }
    }

    self.dom.currentTime.text(self.config.timeMainFormat(timestampsToDisplay[0].value));


    var label = d3.select(self.dom.timeLabels[0]).selectAll('.time-label')
        .data(timestampsToDisplay);


    label.enter().append('div')
        .attr('class', 'time-label')
        .style('top', function (d) {
            return d.offset + 'px';
        })
        .text(function (d, i) {
            //if on the past, hide first timestamp (already present on title)
            if (self.trackerType == IssTracker.VIEW_PAST && i == 0)
                return;

            return self.config.timeLabelFormat(d.value);
        });

    label
        .style('top', function (d) {
            return d.offset + 'px';
        })
        .text(function (d, i) {
            if (self.trackerType == IssTracker.VIEW_PAST && i == 0)
                return;

            return self.config.timeLabelFormat(d.value);
        });

    label.exit().remove();
};


// ================================================================================
// UTILS
// ================================================================================

// returns the provided coordinates converted in metric projection
IssTracker.prototype.projectCoords = function (latlonCoords) {
    return ol.proj.transform(latlonCoords, IssTracker.MAP_LATLON, IssTracker.MAP_METRIC);
};

IssTracker.prototype.getOrbitById = function (orbitId) {
    var self = this;
    var orbit = null;
    if (self.orbits.current.id == orbitId) orbit = self.orbits.current;
    else if (self.orbits.next.id == orbitId) orbit = self.orbits.next;
    else if (self.orbits.prev.id == orbitId) orbit = self.orbits.prev;
    else if (self.orbits.buffer.id == orbitId) orbit = self.orbits.buffer;

    return orbit;
};


// ================================================================================
// MARKERS POPUPS
// ================================================================================
IssTracker.prototype.showPopupMarkerCluster = function (coords, features) {
    var self = this;

    self.updatePopupBorder();
    self.dom.clusterMarkerPopup.find('.people').text(features.length);
    var lon = (coords[0] + features[0].orbitId * 360).toFixed(2);
    var textLon = (lon > 0) ? lon + '°E' : -lon + '°W';
    var lat = coords[1].toFixed(2);
    var textLat = (lat > 0) ? lat + '°N' : -lat + '°S';
    var location = textLon + ' / ' + textLat;
    self.dom.clusterMarkerPopup.find('.location').text(location);
    self.dom.singleMarkerPopup.hide();
    self.dom.clusterMarkerPopup.show();

};

IssTracker.prototype.showPopupMarkerSingle = function (feature) {
    var self = this;

    self.updatePopupBorder();
    var coordinates = feature.getGeometry().getCoordinates();
    var location = ol.proj.transform(coordinates, "EPSG:3857", "EPSG:4326");

    Meteor.call('getUser', feature.userId, function (err,userData) {


        if (userData && userData.profile) {
            self.dom.singleMarkerPopup.find('.user-name').text(userData.profile.name);
            var imageUrl = userData.profile.profileImage;
            self.dom.singleMarkerPopup.find('.image').show();
            self.dom.singleMarkerPopup.find('.image').css('background-image', 'url(' + imageUrl + ')');

            self.dom.singleMarkerPopup.find('.sam-orbits-number').text(userData.profile.onOrbit ? userData.profile.onOrbit.length : 0);
            if (userData.profile.friends) {
                self.dom.singleMarkerPopup.find('.connected-people-number').text(userData.profile.friends ? userData.profile.friends.length : 0);
            } else {
                self.dom.singleMarkerPopup.find('.connected-people-number').text(0);
            }

            if (userData.profile.service == 'twitter') {
                var urls = [
                    "text=Hello @" + userData.profile.twitterScreenName + " ! We shared an orbit on",
                    "url=http://www.friendsinspace.org",
                    "hashtags=friendsinspace"
                ];

                var url = "https://twitter.com/intent/tweet?" + urls.join("&") + "&";

                self.dom.singleMarkerPopup.find('.interactions.tweet').attr('href', url);
                self.dom.singleMarkerPopup.find('.interactions.twitter-account').attr('href', userData.profile.profileLink);
                self.dom.singleMarkerPopup.find('.twitter-interactions').show();
                self.dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                self.dom.singleMarkerPopup.find('.facebook-interactions').hide();
            } else if (userData.profile.service == 'google') {

                self.dom.singleMarkerPopup.find('.interactions.google-plus-account').attr('href', userData.profile.profileLink);
                self.dom.singleMarkerPopup.find('.twitter-interactions').hide();
                self.dom.singleMarkerPopup.find('.google-plus-interactions').show();
                self.dom.singleMarkerPopup.find('.facebook-interactions').hide();
            } else if (userData.profile.service == 'facebook') {

                self.dom.singleMarkerPopup.find('.interactions.facebook-account').attr('href', userData.profile.profileLink);
                self.dom.singleMarkerPopup.find('.twitter-interactions').hide();
                self.dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                self.dom.singleMarkerPopup.find('.facebook-interactions').show();
            } else {
                self.dom.singleMarkerPopup.find('.interactions').hide();
                self.dom.singleMarkerPopup.find('.twitter-interactions').hide();
                self.dom.singleMarkerPopup.find('.google-plus-interactions').hide();
                self.dom.singleMarkerPopup.find('.facebook-interactions').hide();
            }


        } else{
            self.dom.singleMarkerPopup.find('.user-name').text("user #" + user.userId.slice(0, 4));
            self.dom.singleMarkerPopup.find('.image').hide();
            self.dom.singleMarkerPopup.find('.sam-orbits-number').hide();
            self.dom.singleMarkerPopup.find('.connected-people-number').hide();

        }

        self.dom.singleMarkerPopup.find('.user-location').text(self.formatCoords(location,feature.orbitId));

        //show marker popup
        self.dom.clusterMarkerPopup.hide();
        self.dom.singleMarkerPopup.show();
    });



};

IssTracker.prototype.formatCoords =  function (coords, orbitId) {
    var lng = coords[0] - orbitId * 360;
    lng = lng > 0 ? lng.toFixed(2) + "°E" : -lng.toFixed(2) + "°W";
    var lat = coords[1] > 0 ? coords[1].toFixed(2) + "°N" : -coords[1].toFixed(2) + "°S";
    return lng + " / " + lat;

};

IssTracker.prototype.hidePopups = function () {
    var self = this;
    self.dom.map.css('cursor', 'auto');
    if (!self.hoveredMarkers.persistent) {
        self.dom.singleMarkerPopup.hide();
        self.dom.clusterMarkerPopup.hide();
        self.dom.eventsSpotPopup.hide();
    }
};

IssTracker.prototype.updatePopupBorder = function () {

    var self = this;

    if (self.hoveredMarkers.persistent) {
        self.dom.singleMarkerPopup.css('border', '1px solid #879299');
        self.dom.singleMarkerPopup.find('.actions').css('visibility', 'visible');
    }
    else {
        self.dom.singleMarkerPopup.css('border', '1px solid rgba(0,0,0,0)');
        self.dom.singleMarkerPopup.find('.actions').css('visibility', 'hidden');
    }

    if (self.hoveredMarkers.persistent) self.dom.clusterMarkerPopup.css('border', '1px solid #879299');
    else self.dom.clusterMarkerPopup.css('border', '1px solid rgba(0,0,0,0)');

};

// ================================================================================
// EVENTS SPOT POPUPS
// ================================================================================
IssTracker.prototype.showPopupEventsSpot = function (feature) {
    var self = this;

    self.dom.eventsSpotPopup.find('.description').text(feature.description.substring(0, 70));
    self.dom.eventsSpotPopup.find('.person').text(feature.personName);

    self.dom.eventsSpotPopup.show();
};

// ================================================================================
// FEATURES MOUSE HOVER
// ================================================================================
IssTracker.prototype.setFeatureHighlighted = function (feature, layer) {
    if (feature == undefined || feature == null) return;

    if (layer == IssTracker.LAYER_MARKERS) {
        var onOrbit = feature.get('features')[0].onOrbit; // no need to use other features in clusters since every feature is of the same type
        var size = feature.get('features').length;

        //TODO FIX TO USE SAM GREETINGS
        var greetings = 0;
        if (size == 1) {
            greetings = feature.get('features')[0].greetings;
        } else {
            for (var i = 0; i < size; i++) {
                greetings += feature.get('features')[i].greetings;
            }
        }

        var styleCacheType = onOrbit ? 'onOrbit' : 'outOrbit';

        var highlightStyle = this.hoveredMarkers.styleCache[styleCacheType][size + '-' + greetings];

        if (!highlightStyle) {

            var placeholderCircles = [];

            if (size == 1) {
                if (onOrbit) {

                    var circleMarker = {
                        radius: this.config.markerBaseSizeSingle + this.config.markerHoverStrokeWidth / 2,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitIn}),
                        stroke: new ol.style.Stroke({color: this.config.markerHoverStrokeColor, width: this.config.markerHoverStrokeWidth})
                    };

                    var circleGreetings = {
                        radius: 2 * this.config.markerBaseSizeSingle + greetings + this.config.greetingsExternalOffset,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitIn})
                    };

                    placeholderCircles.push(circleGreetings, circleMarker);

                } else {

                    var circleMarker = {
                        radius: this.config.markerBaseSizeSingle + this.config.markerHoverStrokeWidth / 2,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitOut}),
                        stroke: new ol.style.Stroke({color: this.config.markerHoverStrokeColor, width: this.config.markerHoverStrokeWidth})
                    };

                    var circleGreetingsInt = {
                        radius: 2 * this.config.markerBaseSizeSingle + greetings,
                        stroke: new ol.style.Stroke({color: this.config.greetingsInternalColor, width: this.config.greetingsInternalWidth})
                    };

                    var circleGreetingsExt = {
                        radius: 2 * this.config.markerBaseSizeSingle + greetings + this.config.greetingsExternalOffset,
                        stroke: new ol.style.Stroke({color: this.config.greetingsExternalColor, width: this.config.greetingsExternalWidth})
                    };

                    placeholderCircles.push(circleGreetingsExt, circleGreetingsInt, circleMarker);

                }
            } else {
                if (onOrbit) {

                    var circleMarker = {
                        radius: this.config.markerBaseSizeCluster + this.config.markerHoverStrokeWidth + 1,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitIn}),
                        stroke: new ol.style.Stroke({color: this.config.markerHoverStrokeColor, width: this.config.markerHoverStrokeWidth})
                    };

                    var circleGreetings = {
                        radius: 2 * this.config.markerBaseSizeCluster + greetings + this.config.greetingsExternalOffset,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitIn})
                    };

                    placeholderCircles.push(circleGreetings, circleMarker);

                } else {

                    var circleMarker = {
                        radius: this.config.markerBaseSizeCluster + this.config.markerHoverStrokeWidth + 1,
                        fill: new ol.style.Fill({color: this.config.markerColorOrbitOut}),
                        stroke: new ol.style.Stroke({color: this.config.markerHoverStrokeColor, width: this.config.markerHoverStrokeWidth})
                    };

                    var circleGreetingsInt = {
                        radius: 2 * this.config.markerBaseSizeCluster + greetings,
                        stroke: new ol.style.Stroke({color: this.config.greetingsInternalColor, width: this.config.greetingsInternalWidth})
                    };

                    var circleGreetingsExt = {
                        radius: 2 * this.config.markerBaseSizeCluster + greetings + this.config.greetingsExternalOffset,
                        stroke: new ol.style.Stroke({color: this.config.greetingsExternalColor, width: this.config.greetingsExternalWidth})
                    };

                    placeholderCircles.push(circleGreetingsExt, circleGreetingsInt, circleMarker);

                }
            }

            var placeholderText = null;
            if (size > 1) {
                placeholderText = new ol.style.Text({
                    text: size.toString(),
                    scale: 1,
                    fill: new ol.style.Fill({color: this.config.markerTextColor})
                });
            }


            highlightStyle = [new ol.style.Style({
                image: new ol.style.MultiCircle({circles: placeholderCircles}),
                text: placeholderText
            })];

            this.hoveredMarkers.styleCache[styleCacheType][size + '-' + greetings] = highlightStyle;
        }

        feature.setStyle(highlightStyle);
        this.hoveredMarkers.objects.push(feature);

    }
};

IssTracker.prototype.resetFeaturesHighlight = function () {
    for (var i = 0; i < this.hoveredMarkers.objects.length; i++) {
        this.hoveredMarkers.objects[i].setStyle(null);
    }
    this.hoveredMarkers.objects = [];
};


IssTracker.prototype.handleFeatureMouseOver = function (pixel) {

    var self = this;

    var hoveredElements = this.map.forEachFeatureAtPixel(pixel, function (feature, layer) {

        var layerType = layer.get('type');

        var feats = {
            markers: [],
            eventsSpot: [],
            eventsInterval: []
        };

        if (layerType != undefined && layerType == IssTracker.LAYER_MARKERS) {
            feats.markers.push(feature);
            self.setFeatureHighlighted(feature, IssTracker.LAYER_MARKERS);
        }

        else if (layerType != undefined && layerType == IssTracker.LAYER_EVENTS_SPOT) {
            feats.eventsSpot.push(feature);
        }

        else if (layerType != undefined && layerType == IssTracker.LAYER_EVENTS_INTERVAL) {
            feats.eventsInterval.push(feature);
        }

        if (feats.markers.length > 0 ||
            feats.eventsSpot.length > 0 ||
            feats.eventsInterval.length > 0) return feats;

    });

    if (hoveredElements == undefined) {
        // no hovered elements returned
        self.resetFeaturesHighlight();
        self.hidePopups();

    } else {
        if (hoveredElements.markers.length > 0) {
            // HANDLE FEATURE TYPE: MARKERS
            var features = hoveredElements.markers[0].get('features');
            if (features.length > 1) {
                //it's a cluster
                var coordinates = hoveredElements.markers[0].getGeometry().getCoordinates();
                self.markersLayer.clusterMarkerPopup.setPosition(coordinates);
                self.showPopupMarkerCluster(ol.proj.transform(coordinates, IssTracker.MAP_METRIC, IssTracker.MAP_LATLON), features);
                self.dom.map.css('cursor', 'pointer');
            } else {
                //single feature
                this.markersLayer.singleMarkerPopup.setPosition(features[0].getGeometry().getCoordinates());
                self.showPopupMarkerSingle(features[0]);
                self.dom.map.css('cursor', 'pointer');
            }
        } else if (hoveredElements.eventsSpot.length > 0) {
            // HANDLE FEATURE TYPE: EVENTS SPOT
            var feature = hoveredElements.eventsSpot[0];
            this.eventsLayer.eventsSpotPopup.setPosition(feature.getGeometry().getCoordinates());
            self.showPopupEventsSpot(feature);
            self.dom.map.css('cursor', 'pointer');

        } else if (hoveredElements.eventsInterval.length > 0) {
            // HANDLE FEATURE TYPE: EVENTS SPOT
            var features = hoveredElements.eventsInterval[0].get('features');
            self.dom.map.css('cursor', 'pointer');

        }
    }
};


// ================================================================================
// ORBITS LAYERS
// ================================================================================
IssTracker.prototype.setupOrbitsLayer = function () {

    var strokeStyle;
    if (this.trackerType == IssTracker.VIEW_FUTURE) {
        strokeStyle = {
            color: this.config.orbitPathColor,
            width: this.config.orbitPathWidth,
            lineDash: this.config.orbitPathLineDash
        };

    } else if (this.trackerType == IssTracker.VIEW_PAST) {
        strokeStyle = {
            color: this.config.orbitPathColor,
            width: this.config.orbitPathWidth
        };
    }

    this.orbitsLayer.style = [new ol.style.Style({stroke: new ol.style.Stroke(strokeStyle)})];

    // init slots with current loaded orbits
    this.orbitsLayer.slots[0].features = [];
    this.orbitsLayer.slots[0].features.push(new ol.Feature({'geometry': (new ol.geom.LineString([this.orbits.prev.coordinates[this.orbits.prev.coordinates.length - 1], this.orbits.current.coordinates[0]])).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
    this.orbitsLayer.slots[0].features.push(new ol.Feature({'geometry': (new ol.geom.LineString(this.orbits.prev.coordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
    this.orbitsLayer.slots[0].orbitId = this.orbits.prev.id;

    this.orbitsLayer.slots[1].features = [];
    this.orbitsLayer.slots[1].features.push(new ol.Feature({'geometry': (new ol.geom.LineString(this.orbits.current.coordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
    this.orbitsLayer.slots[1].orbitId = this.orbits.current.id;

    this.orbitsLayer.slots[2].features = [];
    this.orbitsLayer.slots[2].features.push(new ol.Feature({'geometry': (new ol.geom.LineString([this.orbits.current.coordinates[this.orbits.current.coordinates.length - 1], this.orbits.next.coordinates[0]])).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
    this.orbitsLayer.slots[2].features.push(new ol.Feature({'geometry': (new ol.geom.LineString(this.orbits.next.coordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
    this.orbitsLayer.slots[2].orbitId = this.orbits.next.id;

    for (var i = 0; i < this.config.layerSlots; i++) {
        this.orbitsLayer.slots[i].source = new ol.source.GeoJSON({projection: IssTracker.MAP_METRIC});
        this.orbitsLayer.slots[i].source.addFeatures(this.orbitsLayer.slots[i].features);
        this.orbitsLayer.slots[i].object = new ol.layer.Vector({source: this.orbitsLayer.slots[i].source, style: this.orbitsLayer.style, type: IssTracker.LAYER_ORBITS});
    }

};

IssTracker.prototype.updateOrbitsLayer = function (direction) {

    var slotIndex = this.orbitsLayer.getAvailableSlot(direction);
    this.orbitsLayer.slots[slotIndex].source.clear();
    if (direction == IssTracker.DIRECTION_FORWARD) {
        this.orbitsLayer.slots[slotIndex].features = [];
        // current2next connector
        this.orbitsLayer.slots[slotIndex].features.push(new ol.Feature({'geometry': (new ol.geom.LineString([this.orbits.current.coordinates[this.orbits.current.coordinates.length - 1], this.orbits.next.coordinates[0]])).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
        // next orbit
        this.orbitsLayer.slots[slotIndex].features.push(new ol.Feature({'geometry': (new ol.geom.LineString(this.orbits.next.coordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
        this.orbitsLayer.slots[slotIndex].orbitId = this.orbits.next.id;
    } else if (direction == IssTracker.DIRECTION_BACKWARD) {
        this.orbitsLayer.slots[slotIndex].features = [];
        // current2prev connector
        this.orbitsLayer.slots[slotIndex].features.push(new ol.Feature({'geometry': (new ol.geom.LineString([this.orbits.prev.coordinates[this.orbits.prev.coordinates.length - 1], this.orbits.current.coordinates[0]])).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
        // prev orbit
        this.orbitsLayer.slots[slotIndex].features.push(new ol.Feature({'geometry': (new ol.geom.LineString(this.orbits.prev.coordinates)).transform(IssTracker.MAP_LATLON, IssTracker.MAP_METRIC)}));
        this.orbitsLayer.slots[slotIndex].orbitId = this.orbits.prev.id;
    }
    this.orbitsLayer.slots[slotIndex].source.addFeatures(this.orbitsLayer.slots[slotIndex].features);

};

// ================================================================================
// MARKERS LAYERS
// ================================================================================
IssTracker.prototype.setupMarkersLayer = function () {

    var self = this;

    this.markersLayer.styleCache = {

        textFill: (new ol.style.Fill({color: self.config.markerTextColor})),

        onOrbit: {
            fill: (new ol.style.Fill({color: self.config.markerColorOrbitIn}))
        },
        outOrbit: {
            fill: (new ol.style.Fill({color: self.config.markerColorOrbitOut}))
        }
    };

    this.markersLayer.style = function (featureCluster, resolution) {

        var features = featureCluster.get('features');
        var size = features.length;
        var style = null;

        if (size == 1) {
            // single feature in cluster
            var feature = features[0];
            if (feature.onOrbit) {
                style = self.markersLayer.styleCache.onOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: self.config.markerBaseSizeSingle,
                            fill: self.markersLayer.styleCache.onOrbit.fill
                        })
                    })];
                    self.markersLayer.styleCache.onOrbit[size] = style;
                }
                return style;

            } else {
                style = self.markersLayer.styleCache.outOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: self.config.markerBaseSizeSingle,
                            fill: self.markersLayer.styleCache.outOrbit.fill
                        })
                    })];
                    self.markersLayer.styleCache.outOrbit[size] = style;
                }
                return style;
            }
        } else {

            // multiple features in cluster
            if (features[0].onOrbit) {
                style = self.markersLayer.styleCache.onOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: self.config.markerBaseSizeCluster + 2 * size,
                            fill: self.markersLayer.styleCache.onOrbit.fill
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: self.markersLayer.styleCache.textFill
                        })
                    })];
                    self.markersLayer.styleCache.onOrbit[size] = style;
                }
                return style;

            } else {
                style = self.markersLayer.styleCache.outOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: self.config.markerBaseSizeCluster + 2 * size,
                            fill: self.markersLayer.styleCache.outOrbit.fill
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: self.markersLayer.styleCache.textFill
                        })
                    })];
                    self.markersLayer.styleCache.outOrbit[size] = style;
                }
                return style;
            }
        }
    };

    // init slots with current loaded orbit markers
    this.markersLayer.slots[0].features = this.orbits.prev.markers;
    this.markersLayer.slots[0].orbitId = this.orbits.prev.id;
    this.markersLayer.slots[1].features = this.orbits.current.markers;
    this.markersLayer.slots[1].orbitId = this.orbits.current.id;
    this.markersLayer.slots[2].features = this.orbits.next.markers;
    this.markersLayer.slots[2].orbitId = this.orbits.next.id;

    for (var i = 0; i < this.config.layerSlots; i++) {
        this.markersLayer.slots[i].source = new ol.source.GeoJSON({projection: IssTracker.MAP_METRIC});
        this.markersLayer.slots[i].cluster = new ol.source.Cluster({distance: 40, source: this.markersLayer.slots[i].source});
        this.markersLayer.slots[i].source.addFeatures(this.markersLayer.slots[i].features);
        this.markersLayer.slots[i].object = new ol.layer.Vector({source: this.markersLayer.slots[i].cluster, style: this.markersLayer.style, type: IssTracker.LAYER_MARKERS});
    }
};

IssTracker.prototype.refreshMarkersLayer = function () {

    for (var i = 0; i < this.config.layerSlots; i++) {
        var slotOrbit = this.getOrbitById(this.markersLayer.slots[i].orbitId);
        if (slotOrbit != null) {
            this.markersLayer.slots[i].features = slotOrbit.markers;
            this.markersLayer.slots[i].source.clear();
            this.markersLayer.slots[i].source.addFeatures(this.markersLayer.slots[i].features);
        }
    }
};

IssTracker.prototype.updateMarkersLayer = function (direction) {

    var slotIndex = this.markersLayer.getAvailableSlot(direction);
    this.markersLayer.slots[slotIndex].source.clear();
    if (direction == IssTracker.DIRECTION_FORWARD) {
        this.markersLayer.slots[slotIndex].features = this.orbits.next.markers;
        this.markersLayer.slots[slotIndex].orbitId = this.orbits.next.id;
    } else if (direction == IssTracker.DIRECTION_BACKWARD) {
        this.markersLayer.slots[slotIndex].features = this.orbits.prev.markers;
        this.markersLayer.slots[slotIndex].orbitId = this.orbits.prev.id;
    }
    this.markersLayer.slots[slotIndex].source.addFeatures(this.markersLayer.slots[slotIndex].features);
};

// ================================================================================
// ORBIT EVENTS INTERVAL LAYER
// ================================================================================
IssTracker.prototype.setupEventsIntervalLayer = function () {

    var self = this;

    this.eventsLayer.interval.style = function (feature, resolution) {

        var style = self.eventsLayer.interval.styleCache[feature.color];
        if (!style) {
            style = [new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: feature.color,
                    width: self.config.eventIntervalStrokeWidth
                })
            })];
            self.eventsLayer.interval.styleCache[feature.color] = style;
        }
        return style;
    };


    // init slots with current loaded orbits
    this.eventsLayer.interval.slots[0].features = this.orbits.prev.eventsInterval;
    this.eventsLayer.interval.slots[0].orbitId = this.orbits.prev.id;
    this.eventsLayer.interval.slots[1].features = this.orbits.current.eventsInterval;
    this.eventsLayer.interval.slots[1].orbitId = this.orbits.current.id;
    this.eventsLayer.interval.slots[2].features = this.orbits.next.eventsInterval;
    this.eventsLayer.interval.slots[2].orbitId = this.orbits.next.id;

    for (var i = 0; i < this.config.layerSlots; i++) {
        this.eventsLayer.interval.slots[i].source = new ol.source.GeoJSON({projection: IssTracker.MAP_METRIC});
        this.eventsLayer.interval.slots[i].source.addFeatures(this.eventsLayer.interval.slots[i].features);
        this.eventsLayer.interval.slots[i].object = new ol.layer.Vector({
            source: this.eventsLayer.interval.slots[i].source,
            style: this.eventsLayer.interval.style,
            type: IssTracker.LAYER_EVENTS_INTERVAL
        });
    }

};

IssTracker.prototype.refreshEventsIntervalLayer = function () {

    for (var i = 0; i < this.config.layerSlots; i++) {
        var slotOrbit = this.getOrbitById(this.eventsLayer.interval.slots[i].orbitId);
        if (slotOrbit != null) {
            this.eventsLayer.interval.slots[i].features = slotOrbit.eventsInterval;
            this.eventsLayer.interval.slots[i].source.clear();
            this.eventsLayer.interval.slots[i].source.addFeatures(this.eventsLayer.interval.slots[i].features);
        }
    }
};

IssTracker.prototype.updateEventsIntervalLayer = function (direction) {

    var slotIndex = this.eventsLayer.interval.getAvailableSlot(direction);
    this.eventsLayer.interval.slots[slotIndex].source.clear();
    if (direction == IssTracker.DIRECTION_FORWARD) {
        this.eventsLayer.interval.slots[slotIndex].features = this.orbits.next.eventsInterval;
        this.eventsLayer.interval.slots[slotIndex].orbitId = this.orbits.next.id;
    } else if (direction == IssTracker.DIRECTION_BACKWARD) {
        this.eventsLayer.interval.slots[slotIndex].features = this.orbits.prev.eventsInterval;
        this.eventsLayer.interval.slots[slotIndex].orbitId = this.orbits.prev.id;
    }
    this.eventsLayer.interval.slots[slotIndex].source.addFeatures(this.eventsLayer.interval.slots[slotIndex].features);
};

// ================================================================================
// ORBIT EVENTS SPOT
// ================================================================================
IssTracker.prototype.setupEventsSpotLayer = function () {

    var self = this;

    this.eventsLayer.spot.style = [new ol.style.Style({
        image: new ol.style.Circle({
            radius: self.config.eventSpotSize,
            fill: new ol.style.Fill({color: self.config.eventSpotFillColor}),
            stroke: new ol.style.Stroke({color: self.config.eventSpotStrokeColor, width: self.config.eventSpotStrokeWidth})
        })
    })];

    // init slots with current loaded orbits
    this.eventsLayer.spot.slots[0].features = this.orbits.prev.eventsSpot;
    this.eventsLayer.spot.slots[0].orbitId = this.orbits.prev.id;
    this.eventsLayer.spot.slots[1].features = this.orbits.current.eventsSpot;
    this.eventsLayer.spot.slots[1].orbitId = this.orbits.current.id;
    this.eventsLayer.spot.slots[2].features = this.orbits.next.eventsSpot;
    this.eventsLayer.spot.slots[2].orbitId = this.orbits.next.id;

    for (var i = 0; i < this.config.layerSlots; i++) {
        this.eventsLayer.spot.slots[i].source = new ol.source.GeoJSON({projection: IssTracker.MAP_METRIC});
        this.eventsLayer.spot.slots[i].source.addFeatures(this.eventsLayer.spot.slots[i].features);
        this.eventsLayer.spot.slots[i].object = new ol.layer.Vector({
            source: this.eventsLayer.spot.slots[i].source,
            style: this.eventsLayer.spot.style,
            type: IssTracker.LAYER_EVENTS_SPOT
        });
    }

};

IssTracker.prototype.refreshEventsSpotLayer = function () {

    for (var i = 0; i < this.config.layerSlots; i++) {
        var slotOrbit = this.getOrbitById(this.eventsLayer.spot.slots[i].orbitId);
        if (slotOrbit != null) {
            this.eventsLayer.spot.slots[i].features = slotOrbit.eventsSpot;
            this.eventsLayer.spot.slots[i].source.clear();
            this.eventsLayer.spot.slots[i].source.addFeatures(this.eventsLayer.spot.slots[i].features);
        }
    }
};

IssTracker.prototype.updateEventsSpotLayer = function (direction) {

    var slotIndex = this.eventsLayer.spot.getAvailableSlot(direction);
    this.eventsLayer.spot.slots[slotIndex].source.clear();
    if (direction == IssTracker.DIRECTION_FORWARD) {
        this.eventsLayer.spot.slots[slotIndex].features = this.orbits.next.eventsSpot;
        this.eventsLayer.spot.slots[slotIndex].orbitId = this.orbits.next.id;
    } else if (direction == IssTracker.DIRECTION_BACKWARD) {
        this.eventsLayer.spot.slots[slotIndex].features = this.orbits.prev.eventsSpot;
        this.eventsLayer.spot.slots[slotIndex].orbitId = this.orbits.prev.id;
    }
    this.eventsLayer.spot.slots[slotIndex].source.addFeatures(this.eventsLayer.spot.slots[slotIndex].features);
};

// ================================================================================
// GREETINGS LAYERS
// ================================================================================
IssTracker.prototype.setupGreetingsLayer = function () {

    var self = this;

    this.greetingsLayer.styleCache = {
        onOrbit: {
            extFill: (new ol.style.Fill({color: self.config.markerColorOrbitIn}))
        },
        outOrbit: {
            intStroke: (new ol.style.Stroke({color: self.config.greetingsInternalColor, width: self.config.greetingsInternalWidth})),
            extStroke: (new ol.style.Stroke({color: self.config.greetingsExternalColor, width: self.config.greetingsExternalWidth}))
        }
    };

    this.greetingsLayer.style = function (featureCluster, resolution) {

        var features = featureCluster.get('features');
        var size = 0;
        var style = null;

        if (features.length == 1) {
            //TODO FIX TO USE SAM GREETINGS
            size = 2 * self.config.markerBaseSizeSingle + features[0].greetings;

            // single feature in cluster
            if (features[0].onOrbit) {
                style = self.greetingsLayer.styleCache.onOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.DoubleCircle({
                            extRadius: size + self.config.greetingsExternalOffset, // offset between two lines
                            extFill: self.greetingsLayer.styleCache.onOrbit.extFill
                        })
                    })];
                    self.greetingsLayer.styleCache.onOrbit[size] = style;
                }
            } else {
                style = self.greetingsLayer.styleCache.outOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.DoubleCircle({
                            intRadius: size,
                            intStroke: self.greetingsLayer.styleCache.outOrbit.intStroke,
                            extRadius: size + self.config.greetingsExternalOffset,
                            extStroke: self.greetingsLayer.styleCache.outOrbit.extStroke
                        })
                    })];
                    self.greetingsLayer.styleCache.outOrbit[size] = style;
                }
            }
        } else {
            size = 2 * self.config.markerBaseSizeCluster;
            //TODO DETECT MAX SAM GREETINGS
            for (var i = 0; i < features.length; i++) {
                size += features[i].greetings;
            }

            // multiple features in cluster
            if (features[0].onOrbit) {
                style = self.greetingsLayer.styleCache.onOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.DoubleCircle({
                            extRadius: size + self.config.greetingsExternalOffset,
                            extFill: self.greetingsLayer.styleCache.onOrbit.extFill
                        })
                    })];
                    self.greetingsLayer.styleCache.onOrbit[size] = style;
                }
            } else {
                style = self.greetingsLayer.styleCache.outOrbit[size];
                if (!style) {
                    style = [new ol.style.Style({
                        image: new ol.style.DoubleCircle({
                            intRadius: size,
                            intStroke: self.greetingsLayer.styleCache.outOrbit.intStroke,
                            extRadius: size + self.config.greetingsExternalOffset,
                            extStroke: self.greetingsLayer.styleCache.outOrbit.extStroke
                        })
                    })];
                    self.greetingsLayer.styleCache.outOrbit[size] = style;
                }
            }
        }

        return style;
    };

    for (var i = 0; i < this.config.layerSlots; i++) {
        this.greetingsLayer.slots[i].object = new ol.layer.Vector({
            source: this.markersLayer.slots[i].cluster,
            style: this.greetingsLayer.style,
            opacity: 0.5,
            type: IssTracker.LAYER_GREETINGS
        });
    }

};

