var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
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
