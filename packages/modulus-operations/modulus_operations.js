Modulus = {
    /**
     * User has stopped their application. Also sent to instances that will be removed during a scale down.
     */
    onStop:function(){},

    /**
     * User has restarted their application.
     */
    onRestart:function(){},

    /**
     * User has deployed a new version of their application.
     */
    onDeploy: function(){},

    /**
     * On error parsing the request
     */
    onError:function(){}
};
var Fiber = Npm.require('fibers');

if (Meteor.isServer) {

    var express = Npm.require('express');
    var bodyParser = Npm.require('body-parser');
    var modulusShutdownApp = express();

    modulusShutdownApp.use(bodyParser.json());
    modulusShutdownApp.use (function (error, req, res, next){
        if (error instanceof SyntaxError) {

            Fiber(function () {
                Modulus.onError(error);
                res.end();
            });

        } else {
            next();
        }
    });


    modulusShutdownApp.post('/', function(req, res) {
        // Do whatever cleanup is required and end the request when done.
        if(_.isString(req.body.action)){

            switch(req.body.action){
                case 'stop':
                    Fiber(function () {
                        Modulus.onStop();
                        res.end();
                    }).run();
                    break;
                case 'restart':
                    Fiber(function () {
                        Modulus.onRestart();
                        res.end();
                    }).run();
                    break;
                case 'deploy':
                    Fiber(function () {
                        Modulus.onDeploy();
                        res.end();
                    }).run();
                    break;
            }
        }

    });


    Meteor.startup(function () {
        modulusShutdownApp.listen(63002);
    });
}
