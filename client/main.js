Template.registerHelper('tweetToUser', function(twitterScreenName){

    var urls = [
        "text=Hello @"+twitterScreenName+" ! We shared an orbit on",
        "url=http://www.friendsinspace.org",
        "hashtags=friendsinspace"
    ];

    return "https://twitter.com/intent/tweet?"+urls.join("&")+"&";
});

Template.registerHelper('hasTwitterAccount', function(profile){
    return profile.service == 'twitter';
});

Template.registerHelper('hasGooglePlusAccount', function(profile){
    return profile.service == 'google';
});

Template.registerHelper('hasFacebookAccount', function(profile){
    return profile.service == 'facebook';
});

Template.registerHelper('showDisclaimer', function(){
   return Session.get(FIS.KEYS.SHOW_DISCLAIMER);
});