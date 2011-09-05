(function () {
   var Bot    = require('../index');
   var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
   var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
   var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

   var bot = new Bot(AUTH, USERID, function () {
   bot.roomRegister(ROOMID, function () {

   bot.on('speak', function (data) {
      // Get the data
      var name = data.name;
      var text = data.text;

      // Respond to "/hello" command
      if (text.match(/^\/hello$/)) {
         bot.speak('Hey! How are you '+name+' ?');
      }
   });

   }); });
})();
