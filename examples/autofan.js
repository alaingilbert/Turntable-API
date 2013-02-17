/**
 * Automatically fan a user when he or she enters the room.
 */

var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('registered', function (data) {
var name = data.user[0].name;
var command = data.command; 
   bot.becomeFan(data.user[0].userid);
});
