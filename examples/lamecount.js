/**
 * Automatically vote down on a song when 2 people say "lame"!
 * It's not against the turntable.fm policy to do so...
 * Reccomended for rooms with more people in it!
 */

var Bot    = require('ttapi');
var AUTH   = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

lamecount = 0;

bot.on('speak', function (data) {
  var text = data.text;

  // Any command with "lame" in it will work (ex: "lame","lame i beg you!!!","lollamebaby", etc.)
  if (text.match(/lame/)) {
    lamecount += 1;
  }

  // And when the bopcount reaches two...
  if (lamecount == 2) {
    bot.vote('down');
  }
});

// Reset bopcount per new song
bot.on('newsong', function (data) {
  lamecount = 0;
});
