var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID);

var theUsersList = {};

bot.on('ready', function() {
  console.log("ready");
  bot.directoryRooms(function(data) {
    console.log(data);
  })
});
