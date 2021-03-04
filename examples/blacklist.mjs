/**
 * Auto boot people that are on a blacklist.
 */

import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

// Define global variable "blackList" as an array of USERIDs
var blackList = ['xxxxxxxxxxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxxxxxxxxxx'];

// When someone enters the room, the bot checks whether or not that user is on blacklist.
bot.on('registered', function (data) {
  var user = data.user[0];
  for (var i=0; i<blackList.length; i++) {
    if (user.userid == blackList[i]) {
      bot.bootUser(user.userid, 'You are on the blacklist.');
      break;
    }
  }
});
