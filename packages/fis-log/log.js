var colorConsole = Npm.require('color-console'),
    sprintf = Npm.require('sprintf-js').sprintf,
    vsprintf = Npm.require('sprintf-js').vsprintf;

var ENABLE_INFO = true,
    ENABLE_DEBUG = true,
    ENABLE_ERROR = true,
    ENABLE_WARN = true,
    ENABLE_VERBOSE = false;

function Logger(name) {

    this.name = name || 'DEFAULT';

    this._log = function (type, color, callArgs) {

        var msg,
            args = Array.prototype.slice.call(callArgs),
            timestamp = new Date().toISOString();

        if(args.length > 1){
            var text = args[0];
            var objects = args.slice(1, args.length);
            for(var i = 0; i < objects.length; i++){
                if(typeof objects[i] === 'object'){
                    objects[i] = JSON.stringify(objects[i]);
                }
            }
            if(text.indexOf("%")== -1){
                for(var i = 0; i < objects.length; i++){
                    text += " %s";
                }
            }
            msg = vsprintf(text, objects);
        }else{
            if(typeof args[0] === 'object'){
                msg = JSON.stringify(args[0]);
            }else{
                msg = args[0];
            }
        }

        var consoleMessage = sprintf('%s - [ %s ] - [ %s ] - %s', timestamp, this.name.toUpperCase(), type.toUpperCase(), msg);
        colorConsole[color](consoleMessage);
    };

    this.info = function () {
        if(ENABLE_INFO)
            this._log('info', 'green', arguments);
    };
    this.debug = function () {
        if(ENABLE_DEBUG)
            this._log('debug', 'blue', arguments);
    };
    this.warn = function () {
        if(ENABLE_WARN)
            this._log('warn', 'yellow', arguments);
    };
    this.error = function () {
        if(ENABLE_ERROR)
            this._log('error', 'red', arguments);
    };
    this.verbose = function () {
        if(ENABLE_VERBOSE)
            this._log('verbose', 'grey', arguments);
    };
}


FIS.Log = {
    getLogger: function (name) {
        return new Logger(name);
    }
};
