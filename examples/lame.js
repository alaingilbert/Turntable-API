/**
 * Automatically vote down on a song with "lame"!
 * It's not against the turntable.fm policy to do so...
 * Reccomended for rooms with less people in it!
 */

var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('speak', function (data) {
  var text = data.text;

  // Any command with "lame" in it will work (ex: "lame","lame i beg you!!!","lollame baby", etc.)
  if (text.match(/lame/)) {
    bot.vote('down');
  }
});
