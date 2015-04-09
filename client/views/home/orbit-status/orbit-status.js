Template.fisOrbitStatus.helpers({
    orbitId:function(){
        return Session.get(FIS.KEYS.CURR_ORBIT_ID);
    },
    orbitPercent: function(){
        var percent = Session.get(FIS.KEYS.CURR_ORBIT_PER);
        if(percent!= null){
            return percent+"%";
        }else
            return null;
    }
});