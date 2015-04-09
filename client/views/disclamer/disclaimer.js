
Template.fisDisclaimerModal.rendered = function(){

            var container = $('#disclaimer-modal-text');
            container.perfectScrollbar({
                includePadding: true,
                suppressScrollX: true
            });
            console.log("show perfect scrollbar");

};

Template.fisDisclaimerModal.destroyed = function(){
    $('#disclaimer-modal-text').perfectScrollbar('destroy');
    console.log("hide perfect scrollbar");
};


Template.fisDisclaimerModal.events({
    'click #disclaimer-close': function () {
        Session.set(FIS.KEYS.SHOW_DISCLAIMER,false);
    }
});