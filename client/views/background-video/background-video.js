var videoWidth = 640,
    videoHeight = (360 - 32),
    videoRatio = videoWidth / videoHeight;

function resize() {
    var windowRatio = window.innerWidth / window.innerHeight;

    if (windowRatio >= videoRatio) {
        var height = (videoHeight + 32) * window.innerWidth / videoWidth,
            width = window.innerWidth,
            left = 0,
            top = -32;
    } else {
        var height = window.innerHeight + 32,
            width = videoWidth * (window.innerHeight + 32) / (videoHeight),
            left = (window.innerWidth - width) / 2,
            top = -32;
    }
    var videoElement = document.getElementById('fis-iss-video-stream');
    if(videoElement){
        videoElement.style.position = 'absolute';
        videoElement.style.height = height + "px";
        videoElement.style.width = width + "px";
        videoElement.style.left = left + 'px';
        videoElement.style.top = (top) + 'px';
    }
}


Template.fisBackgroundVideo.rendered = function () {

    $(window).resize(resize);
    resize();

    Tracker.autorun(function(){
        Session.get(FIS.KEYS.ENABLE_VIDEO);
        resize();
    })


};

Template.fisBackgroundVideo.helpers({

    videoStatus: function () {
        Meteor.setTimeout(resize, 500);
        return Session.get(FIS.KEYS.ENABLE_VIDEO);
    }

});