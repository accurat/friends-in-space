var keyPressHandler = function(event){
    if(event.charCode == 104){
        Meteor.call('sendEarthGreetings', Session.get(FIS.KEYS.UUID), function () {
        });
    }
    if(event.charCode == 115){
        var user = Session.get(FIS.KEYS.USER);
        if(user && user.onOrbit){
            var distance = OnlineMap.findSamDistance();
            Meteor.call('sendSamGreetings', Session.get(FIS.KEYS.UUID), distance, function () {
            });
        }

    }
};
Template.fisGreetingControls.rendered = function(){
    $('body').on('keypress',keyPressHandler);
};
Template.fisGreetingControls.destroyed = function(){
    $('body').off('keypress',keyPressHandler);
};

Template.fisGreetingControls.helpers({
    onOrbit: function () {
        var user = Session.get(FIS.KEYS.USER);
        return user && user.onOrbit;
    }
});

Template.fisGreetingControls.events({
    'click #greetings': function () {

        Meteor.call('sendEarthGreetings', Session.get(FIS.KEYS.UUID), function () {
        });

    },
    'click #greetingsSam': function () {
        var distance = OnlineMap.findSamDistance();
        Meteor.call('sendSamGreetings', Session.get(FIS.KEYS.UUID), distance, function () {
        });
    }
});