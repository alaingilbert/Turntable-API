var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID);

bot.on('ready', function (data) {
   bot.roomRegister(ROOMID);
});

bot.on('speak', function (data) {
   // Get the data
   var name = data.name;
   var text = data.text;

   // Respond to "/hello" command
   if (text.match(/^\/hello$/)) {
      bot.speak('Hey! How are you '+name+' ?');
   }
});
