Template.fisSamProfile.helpers({
    samLocation: function(){
        var coords = Session.get(FIS.KEYS.CURR_ORBIT_LOC);
        if(coords)
            return OnlineMap.formatCoords(coords);
        else
            return "calculating..."
    }
});
Template.fisSamProfile.events({
    'mouseover .sam-profile': function(event){
        $(event.currentTarget).addClass('highlight-star');
        OnlineMap.highlightSam();
    },
    'mouseout .sam-profile': function(event){
        $(event.currentTarget).removeClass('highlight-star');
        OnlineMap.deHighlightSam();
    }
});