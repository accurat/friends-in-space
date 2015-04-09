SamFeedModel = new Mongo.Collection('fisSamFeed');
CurrentSamGreetingsModel = new Mongo.Collection('fisCurrentSamGreeting');

//security policies
if (Meteor.isServer) {

    SamFeedModel.allow({
        insert: function () {
            return false;
        },
        remove: function () {
            return false;
        },
        update: function () {
            return false;
        }
    });
    CurrentSamGreetingsModel.allow({
        insert: function () {
            return false;
        },
        remove: function () {
            return false;
        },
        update: function () {
            return false;
        }
    });

    Meteor.publish('fisSamFeed', function (limit) {
        if (limit > SamFeedModel.find().count()) {
            limit = 0;
        }

        return SamFeedModel.find({},{fields:{id:1,id_str:1,created_at:1,text:1,'user.name':1,'user.screen_name':1,'user.profile_image_url':1,'entities.media.media_url':1},sort:{id:-1},limit:limit});
    });

    Meteor.publish('fisCurrentSamGreeting', function (limit) {
        return CurrentSamGreetingsModel.find();
    });
}