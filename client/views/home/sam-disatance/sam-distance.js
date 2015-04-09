Template.fisSamDistance.rendered = function(){

};

Template.fisSamDistance.helpers({

    onOrbit: function () {
        var user = Session.get(FIS.KEYS.USER);
        return user && user.onOrbit;
    },
    orbitPercent: function(){
        var percent = Session.get(FIS.KEYS.CURR_ORBIT_PER);
        if(percent!= null){
            return percent+"%";
        }else
            return "0";
    },
    yourPosition: function(){
        //TODO FIX THIS TO USE A DIFFERENT REACTIVE VAR
        Session.get(FIS.KEYS.CURR_ORBIT_LOC);
        var percent = OnlineMap.findMyDistance();
        if(percent!= null){
            return percent+"%";
        }else
            return "0";
    },

    hasNotification: function(){
        return Session.get(FIS.KEYS.NOTIFICATION_TEXT) != null;
    },

    notificationText: function(){
        return Session.get(FIS.KEYS.NOTIFICATION_TEXT);
    }
});

Template.fisSamNotification.helpers({
    samText: function(){
        Session.get(FIS.KEYS.CURR_ORBIT_LOC);
        var distanceTime = OnlineMap.findSamAndMeTimeDistance();
        var absMillis = Math.abs(distanceTime);
        if(absMillis < 60*60*1000){
            var time = moment.utc(absMillis).format('mm:ss');
        }else{
            var time = moment.utc(absMillis).format('HH:mm:ss');
        }
        if(distanceTime < 0){
            //sam was
            return "SAM ORBITED OVER YOU "+time+" AGO";
        }else if(distanceTime >= 0){
            //sam is near
            return "SAM WILL BE THE CLOSEST TO YOU IN THIS ORBIT IN "+time;
        }
    },
    hasNotification: function(){
        return Session.get(FIS.KEYS.NOTIFICATION_TEXT) != null;
    },

    notificationText: function(){
        return Session.get(FIS.KEYS.NOTIFICATION_TEXT);
    }
});