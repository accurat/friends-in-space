Template.fisUserProfile.helpers({
    isUser: function () {
        return Meteor.userId() != null;
    },
    onOrbit: function () {
        var user = Session.get(FIS.KEYS.USER);

        if (user && user.onOrbit)
            return "on-orbit";
        else
            return;
    },
    guestClusterIcon: function () {
        var user = Session.get(FIS.KEYS.USER);
        if (user != null)
            return "icon-fixed-star-" + user.clusterType;
        else
            return;
    },
    userName: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return Meteor.user().profile.name;
        } else {
            var user = Session.get(FIS.KEYS.USER);
            if (user == null) {
                return "";
            } else {
                return "user #" + user.userId.slice(0, 4);
            }
        }
    },
    userProfileImage: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return "url(" + Meteor.user().profile.profileImage + ")";
        } else {
            return null;
        }
    },
    userProfileLink: function () {
        if (Meteor.userId() && Meteor.user() != null) {
            return Meteor.user().profile.profileLink;
        } else {
            return null;
        }
    },
    userLocationDetected: function () {
        var coords = Session.get(FIS.KEYS.USER_LOC);
        if (coords != null || Session.get(FIS.KEYS.USER_LOC_STATUS) == 'found') {
            return true;
        }
        return false;
    },
    userLocationNotDetected: function () {
        if(Session.get(FIS.KEYS.USER_LOC_STATUS) ==  'searching'){
            return "searching...";
        }
        switch (Session.get(FIS.KEYS.USER_LOC_STATUS)) {
            case  'error-permission':
                return 'share your location to join Samantha and all the Friends in Space';
            default:
                return "Friends in Space can't find your location, please try again later";
                break;
        }
    },
    userLocation: function () {
        var coords = Session.get(FIS.KEYS.USER_LOC);
        if (coords != null)
            return OnlineMap.formatCoords(coords);
    }
});

Template.fisUserProfile.events({

    'mouseover .user-profile': function (event) {
        var user = Session.get(FIS.KEYS.USER);
        if (user.type != 'guest')
            $(event.currentTarget).addClass('highlight-star');
        OnlineMap.highlightUser(user);
    },
    'mouseout .user-profile': function (event) {
        OnlineMap.deHighlightUser();
        $(event.currentTarget).removeClass('highlight-star');
    },

    'click #go-to-control-room': function () {
        showBottomContainer(true);
    },
    'click #request-login': function () {
        Session.set('login-as-guest', false);
    },

    'click #logout': function () {
        Meteor.call('registerOfflineByConnection', function (err, data) {

            Meteor.logout(function (err) {
                if (err) {
                    console.error("error when logout" + err);
                }
            });
        });
    },
    'click #request-user-location': function(){
        findLocation();
    }
});