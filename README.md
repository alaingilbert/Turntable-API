#Turntable API

A simple nodejs wrapper for the turntable API

## Examples

### Simple
    (function () {
       var Bot    = require('./bot').Bot;
       var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
       var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
       var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

       var bot = new Bot(AUTH, USERID, function(sender) {
       bot.user_authenticate(function () {
       bot.room_register(ROOMID, function () {

       bot.on('speak',        function (data) { console.log('Someone has spoken', data); });
       bot.on('update_votes', function (data) { console.log('Someone has voted',  data); });
       bot.on('registered',   function (data) { console.log('Someone registered', data); });

       }); }); });
    })();
