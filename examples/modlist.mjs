/**
 * Moderator commands.
 */

import Bot from 'ttapi';

var AUTH   = process.env.TTAPI_AUTH || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = process.env.TTAPI_USER || 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = process.env.TTAPI_ROOM || 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

// Define global variable "modList" as an array of USERIDs
var modList = ['xxxxxxxxxxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxxxxxxxxxx'];

// When someone is a moderator in the array AND types in "/mod", the bot displays a message.
bot.on('speak', function (data) {
  var name = data.name;
  var text = data.text;
  var userid = data.userid;

  for (var i=0; i<modList.length; i++) {
    if (userid == modList[i]) {
      // Respond to "/mod" command
      if (data.text.match(/^\/mod$/)) {
        bot.speak('Yo @'+data.name+', it looks like you are a bot moderator!');
      }
      // ADD other moderator commands here!
      break;
    }
  }
});
