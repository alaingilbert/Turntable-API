(function () {
   var Bot    = require('ttapi');
   var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
   var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
   var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

   var bot = new Bot(AUTH, USERID, function () {
   bot.roomRegister(ROOMID, function () {

   bot.on('speak',        function (data) { console.log('Someone has spoken', data); });
   bot.on('update_votes', function (data) { console.log('Someone has voted',  data); });
   bot.on('registered',   function (data) { console.log('Someone registered', data); });

   }); });
})();
