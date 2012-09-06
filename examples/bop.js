/**
 * Automatically vote up on a song with "bop"!
 * It's not against the turntable.fm policy to do so...
 * Reccomended for rooms with less people in it!
 */

var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('speak', function (data) {
  var text = data.text;

  // Any command with "bop" in it will work (ex: "bop","bop i beg you!!!","lolbopbaby", etc.)
  if (text.match(/bop/)) {
    bot.vote('up');
  }
});
