var scrollToHash = function  (hash, time) {
    hash = hash || window.location.hash;
    time = time || 500;

    if ($(hash).length) {
        $('.fis-about').animate({
            scrollTop: $(hash).offset().top
        }, time);
    }
};


Template.fisAbout.events({

    'click #see-credits':function(event){
        scrollToHash("#section-footer");
    }
});