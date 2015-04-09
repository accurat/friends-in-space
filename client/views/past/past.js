var issTrackerPast = null;

Template.fisPast.created = function(){
    Session.set('feed-list-length', 20);
    Session.get('show-past-activities',false);

    this.autorun(function(){
        Meteor.subscribe('fisSamFeed',Session.get('feed-list-length'));
    });

};

Template.fisPast.rendered = function(){

    issTrackerPast = new IssTracker('tracker-past', IssTracker.VIEW_PAST);
    issTrackerPast.initialize();
    issTrackerPast.enableAutomaticScroll();

};

Template.fisPast.destroyed = function(){
    if(issTrackerPast)
        issTrackerPast.destroy();
};

Template.fisPast.helpers({
    feedSelected:function(){
        return Session.get('show-past-activities') ? '':'selected';
    },
    pastActivitiesSelected: function(){
        return Session.get('show-past-activities') ? 'selected':'';
    },
    pastActivities: function(){
        return Session.get('show-past-activities');
    }

});

Template.fisPast.events({
    'click .zoom-in': function(){
        issTrackerPast.zoomIn();
    },
    'click .zoom-out': function(){
        issTrackerPast.zoomOut();
    },
    'click #show-past-activities': function(){
        Session.set('show-past-activities',true);
    },
    'click #show-sam-feed': function(){
        Session.set('show-past-activities',false);
    }
});

Template.fisSamFeed.rendered = function(){
    var intervalId = null;


    var container = $('#fis-feed-list');
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
                Session.set('feed-list-length', Session.get('feed-list-length') + 10);
            }, 1000);
        }
    });

};
Template.fisSamFeed.helpers({
    samFeed: function () {
        return SamFeedModel.find({}, {limit: Session.get('feed-list-length')});
    }
});


Template.fisSamFeedContent.helpers({
    formatFeedTime: function(time){
        var date = moment(time);
        var oneDayBefore = moment().subtract(1,'days');
        if(date.isBefore(oneDayBefore)){
            return date.format('D MMM YYYY');
        }
        return date.fromNow();
    },
    permalink: function(){
      return "https://www.twitter.com/"+this.user.screen_name+"/status/"+this.id_str;
    },
    twitterText: function(text){
        var html = TwitterText.autoLink(text,{targetBlank:true});
        return Spacebars.SafeString(html);
    },
    hasImage: function() {
        if(this.entities.media != null && this.entities.media.length > 0) {
            return true;
        }
        return false;
    },
    getSingleImage: function(){
        if(this.entities.media != null && this.entities.media.length > 0) {
            return this.entities.media[0].media_url + ":small";
        }
        return null;
    }
});

