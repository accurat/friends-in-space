Template.fisControlRoomPeople.created = function () {

    Session.setDefault('orbit-list-people-limit', 10);

    this.autorun(function () {

        if(Meteor.user() == null){
            return;
        }

        //handle the count of people in orbits
        var type = Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE);

        if (Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT) == null) {
            var orbits;
            switch (Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE)) {
                case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL:
                    orbits = Meteor.user().profile.orbits;
                    break;
                case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ON_ORBIT:
                    orbits = Meteor.user().profile.onOrbit;
                    break;
                case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_IN_SPACE:
                    orbits = Meteor.user().profile.inSpace;
                    break;
            }

            if (orbits != null) {
                Meteor.call('countUsersInOrbit', orbits, function (err, data) {
                    if (err) {
                        console.error(err);
                    } else {
                        Session.set('orbits-people-count', data);
                    }
                });
            }


            Meteor.subscribe('fisUsersOnOrbits', orbits, Session.get('orbit-list-people-limit'));
        } else {

            var orbits = [Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT)];


            if (orbits != null) {
                Meteor.call('countUsersInOrbit', orbits, function (err, data) {
                    if (err) {
                        console.error(err);
                    } else {
                        Session.set('orbits-people-count', data);
                    }
                });
            }

            Meteor.subscribe('fisUsersOnOrbits', orbits, Session.get('orbit-list-people-limit'));
        }


    });
};
Template.fisControlRoomPeople.rendered = function () {

    var intervalId = null;

    var container = $('#control-room-people-list');
    container.perfectScrollbar({
        includePadding:true,
        suppressScrollX:true
    });

    container.scroll(function(e) {
        if (container.scrollTop() === container.prop('scrollHeight') - container.height()) {
            if (intervalId != null) {
                Meteor.clearInterval(intervalId);
            }

            intervalId = Meteor.setTimeout(function () {
                Session.set('orbit-list-people-limit', Session.get('orbit-list-people-limit') + 5);
            }, 1000);
        }
    });

};


Template.fisControlRoomPeople.destroyed = function(){
    $('#control-room-people-list').perfectScrollbar('destroy');
};


Template.fisControlRoomPeople.helpers({
    people: function () {
        if(Meteor.user() == null){
            return [];
        }
        return Meteor.users.find({_id: {$ne: Meteor.userId()}}, {limit: Session.get('orbit-list-people-limit'), sort: {'profile.name': 1}});
    },
    peopleCount: function () {
        if (Meteor.users.find({}).count() < Session.get('orbits-people-count')) {
            Session.set('people-list-more-people', true);
        } else
            Session.set('people-list-more-people', false);

        return Session.get('orbits-people-count');
    },
    morePeople: function () {
        return Session.get('people-list-more-people') ? true : false;
    },
    zeroPeople: function () {
        return Session.get('orbits-people-count') == 0;
    },

    currentOrbit: function () {
        var orbit = Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT);
        if (orbit) {
            return 'in Orbit #' + orbit.orbitId;
        }
        switch (Session.get(FIS.KEYS.CLRM_ORBIT_LIST_TYPE)) {
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ALL:
                return 'in all your orbits';
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_ON_ORBIT:
                return 'in your orbits';
            case FIS.KEYS.CLRM_ORBIT_LIST_TYPE_IN_SPACE:
                return 'in your outsider orbits';
        }
    }
});

Template.fisPersonItem.helpers({
    profileImage: function () {
        return "url(" + this.profile.profileImage + ")";
    },
    orbitsWithSam: function () {
        var orbits = 0;
        if (this.profile.onOrbit) {
            orbits = this.profile.onOrbit.length;
        }
        switch (orbits) {
            case 1:
                return '1 ORBIT';
            default:
                return orbits + " ORBITS";
        }
    },
    profileFriends: function () {
        var friends = 0;
        if (this.profile.friends) {
            friends = this.profile.friends.length;
        }
        switch (friends) {
            case 1:
                return '1 FRIEND';
            default:
                return friends + " FRIENDS";
        }

    },
    profileOnOrbit: function () {
        var orbit = Session.get(FIS.KEYS.CLRM_ORBIT_SEL_ORBIT);
        if (orbit) {
            for (var i = 0; i < this.profile.onOrbit.length; i++) {
                if (this.profile.onOrbit[i].orbitId == orbit.orbitId) {
                    return 'on-orbit';
                }
            }
        }
        return ''
    }
});