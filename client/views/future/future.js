var issTrackerFuture = null;

Template.fisFuture.rendered = function(){

    issTrackerFuture = new IssTracker('tracker-future', IssTracker.VIEW_FUTURE);
    issTrackerFuture.initialize();
    issTrackerFuture.enableAutomaticScroll();

};

Template.fisFuture.destroyed = function(){

    issTrackerFuture.destroy();

};

Template.fisFuture.events({
    'click .zoom-in': function(){
        issTrackerFuture.zoomIn();
    },
    'click .zoom-out': function(){
        issTrackerFuture.zoomOut();
    }
});