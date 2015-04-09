var Twit = Npm.require('twit');
var logger = FIS.Log.getLogger('sam-feed');
var FEED_SPEED = 1000 * 10;

Feed = {

    _twit: undefined,
    lastId: undefined,
    handler: undefined,

    init: function (reset) {
        logger.info('Initialize Sam\'s Twitter feed');
        var self = this;
        self._twit = new Twit({
            consumer_key: process.env.FIS_TWT_KEY,
            consumer_secret: process.env.FIS_TWT_SECRET,
            access_token: process.env.FIS_TWT_ACCESS_TOKEN,
            access_token_secret: process.env.FIS_TWT_ACCESS_TOKEN_SECRET
        });


    },
    start: function () {
        var self = this;
        self.stop();
        logger.info('Start Twitter feed listener');
        var twtGet = Meteor.wrapAsync(self._twit.get, self._twit);

        //call one every 30 seconds
        self.handler = Meteor.setInterval(function () {
            var query = {user_id: '337886919', count: 200};
            if (self.lastId) {
                query.since_id = self.lastId;
            }
            var data = twtGet('statuses/user_timeline', query);

            if (data != null && data.length > 0) {
                logger.debug('Received %s tweets', data.length);
                //save data
                for (var i = 0; i < data.length; i++) {

                    var tweet = data[i];

                    if (tweet.text != null) {

                        if (tweet.text.toLowerCase().indexOf('helloearth') != -1) {
                            CurrentSamGreetingsModel.upsert({current: true}, {createdAt: new Date(), id_str: tweet.id_str, text: tweet.text});
                        }
                    }
                    SamFeedModel.insert(data[i]);
                }
                self.lastId = data[0].id_str;
            }
        }, FEED_SPEED);

    },

    firstFetch: function () {
        var self = this;
        SamFeedModel.remove({});
        var twtGet = Meteor.wrapAsync(self._twit.get, self._twit);


        var query = {user_id: '337886919', count: 200};
        var data = twtGet('statuses/user_timeline', query);

        if (data != null && data.length > 0) {
            logger.debug('Received %s tweets', data.length);
            //save data
            for (var i = 0; i < data.length; i++) {
                SamFeedModel.insert(data[i]);
            }
            self.lastId = data[0].id_str;
        }
    },
    stop: function () {
        var self = this;
        if (self.handler) {
            logger.info('Stopping Twitter feed listener');
            Meteor.clearInterval(self.handler);
        }
        self.handler = null;
    }

};