Template.fisLoginModal.helpers({
    notLogged: function () {
        if(Meteor.user() != null || Session.get('login-as-guest')){
            findLocation();
        }
        return Meteor.user() == null && !Session.get('login-as-guest');
    }
});
Template.fisLoginModal.events({
    'click #login-facebook': function () {
        Meteor.loginWithFacebook({
            requestPermissions: ['public_profile']
        }, function (err) {
            if (err) {
                console.error("error when login with facebook " + err);
            } else {
                findLocation();
            }

        });
    },
    'click #login-twitter': function () {
        Meteor.loginWithTwitter({}, function (err) {
            if (err) {
                console.error("error when login with twitter " + err);
            } else {
                findLocation();
            }

        });
    },
    'click #login-google': function () {
        Meteor.loginWithGoogle({},
            function (err) {
                if (err) {
                    console.error("error when login with google " + err);
                } else {
                    findLocation();
                }
            });
    },
    'click #login-guest': function () {
        Session.set('login-as-guest', true);
        findLocation();
    }
});