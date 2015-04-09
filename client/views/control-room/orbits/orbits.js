Template.fisControlRoomOrbits.created = function () {
    Session.set(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT, 4);

    Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TYPE, FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL);
    Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, null);
    Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TOTAL_COUNT, null);

    Session.set(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE, false);
};

Template.fisControlRoomOrbits.destroyed = function () {
    $('#control-room-orbit-list').perfectScrollbar('destroy');
};


Template.fisControlRoomOrbits.rendered = function () {

    var intervalId = null;

    var container = $('#control-room-orbit-list');
    container.perfectScrollbar({
        includePadding: true,
        suppressScrollX: true
    });

    container.scroll(function (e) {
        if (container.scrollTop() === container.prop('scrollHeight') - container.height()) {
            if (intervalId != null) {
                Meteor.clearInterval(intervalId);
            }
            intervalId = Meteor.setTimeout(function () {
                if (Session.get(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE))
                    Session.set(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT, Session.get(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT) + 1);
                container.perfectScrollbar('update');
            }, 1000);
        }
    });
};


Template.fisControlRoomOrbits.events({

    'click #orbit-list-all': function () {

        $('#control-room-orbit-list').scrollTop(0);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT, 4);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TYPE, FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL);
        Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, null);
    },
    'click #orbit-list-on-orbit': function () {
        $('#control-room-orbit-list').scrollTop(0);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT, 4);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TYPE, FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ON_ORBIT);
        Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, null);
    },
    'click #orbit-list-in-space': function () {
        $('#control-room-orbit-list').scrollTop(0);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT, 4);
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TYPE, FIS.KEYS.CLRM_ORBIT_LIST_TYPE_IN_SPACE);
        Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, null);
    }

});

Template.fisControlRoomOrbits.helpers({

    getSelected: function (viewType) {
        return Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE) == viewType ? 'selected' : '';
    },

    userOrbits: function () {
        var orbits = [], orbitsCount;
        if (Meteor.user() == null) {
            return [];
        }

        switch (Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE)) {

            //show all orbits
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL:
                var onOrbits = Meteor.user().profile.onOrbit;

                if (onOrbits) {
                    for (var i = 0; i < onOrbits.length; i++) {
                        onOrbits[i].onOrbit = true;
                    }
                    orbits = orbits.concat(onOrbits);
                }

                var inSpace = Meteor.user().profile.inSpace;
                if (inSpace) {
                    for (var i = 0; i < inSpace.length; i++) {
                        inSpace[i].onOrbit = false;
                    }
                    orbits = orbits.concat(inSpace);
                }

                break;


            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ON_ORBIT:
                orbits = Meteor.user().profile.onOrbit;
                if (orbits) {
                    for (var i = 0; i < orbits.length; i++) {
                        orbits[i].onOrbit = true;
                    }
                } else {
                    orbits = [];
                }

                break;


            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_IN_SPACE:
                orbits = Meteor.user().profile.inSpace;
                if (orbits) {
                    for (var i = 0; i < orbits.length; i++) {
                        orbits[i].onOrbit = false;
                    }
                } else {
                    orbits = [];
                }

                break;
        }


        orbitsCount = orbits.length;
        Session.set(FIS.KEYS.CLRM_ORBIT_LIST_TOTAL_COUNT, orbitsCount);
        if (orbitsCount == 0) {
            Session.set(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE, false);
            return;
        }
        orbits.sort(function (a, b) {
            return b.orbitId - a.orbitId;
        });

        orbits = orbits.slice(0, Session.get(FIS.KEYS.CLRM_ORBIT_LIST_CUR_LIMIT));
        if (orbits.length < orbitsCount) {
            Session.set(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE, true);
        } else
            Session.set(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE, false);


        //IMPORTANT to support the #each reactivity model https://github.com/meteor/meteor/blob/devel/packages/spacebars/README.md#reactivity-model-for-each
        for (var i = 0; i < orbits.length; i++) {
            orbits[i]._id = orbits[i].orbitId;
        }


        return orbits;
    },
    moreOrbits: function () {
        return Session.get(FIS.KEYS.CLRM_ORBIT_LIST_LOAD_MORE);
    },
    notExistOrbits: function () {
        return Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TOTAL_COUNT) == 0;
    },
    zeroOrbitType: function () {
        switch (Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE)) {
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL:
                return "in space or on orbit";
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_IN_SPACE:
                return "in space";
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ON_ORBIT:
                return "on orbit";


        }
    }
});


Template.fisOrbitChart.helpers({
    orbitId: function () {
        return this.orbitId;
    },
    onOrbitClass: function () {
        return this.onOrbit ? 'on-orbit' : '';
    },
    orbitDate: function () {
        return moment.utc(this.start).format('D MMM YYYY - HH:MM z');
    },
    selected: function () {
        Session.set('orbit-list-people-limit', 10);
        var selectedOrbit = Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT);
        if (selectedOrbit != null && selectedOrbit.orbitId == this.orbitId) {
            return 'selected';
        }
        return '';
    }
});

Template.fisOrbitChart.events({
    'click .orbit': function () {
        if (Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT) != null && Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT).orbitId == this.orbitId) {
            Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, null);
        } else {
            Session.set(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT, {orbitId: this.orbitId, start: this.start});
        }
    },
    'click .share-button a': function (event) {
        event.preventDefault();
        event.stopPropagation();
        var tInstance = Template.instance();
        var data = tInstance.$('.chart canvas')[0].toDataURL();
        var windowRef = window.open(null, 'Share Friends in Space Orbit', 'left=20,top=20,width=500,height=250,toolbar=1,resizable=0');
        Meteor.call('saveImageMap', data, this.orbitId, function (err, url) {
            if (err) {
                console.error(err);
            } else {
                var intent = 'https://twitter.com/intent/tweet?';

                var params = [
                    "text=Join me on www.friendsinspace.org ! This is my orbit on the ISS",
                    "url=" + url
                ];

                var href = intent + params.join('&');
                href+"&";
                windowRef.location = href;

            }
        });
        return false;
    }
});

Template.fisOrbitChart.rendered = function () {

    var tData = Template.currentData();
    var tInstance = Template.instance();

    Meteor.call('userOrbitChart', tData.orbitId, function (err, data) {
        if (err || data == null) {
            return;
        } else {
            if(data.orbit != null && data.users != null){
                var chart = new SmallOrbitChart(tInstance.$('.chart .map')[0]);
                chart.init(Meteor.userId(), data.orbit.orbit, data.users, tData.orbitId);
            }

        }

    });
};

Template.fisOrbitChart.destroyed = function () {
    this.$('.chart .map').empty();
    this.$('.chart .map').css({
        visibility: 'hidden',
        width: 470,
        height: 240
    });
};