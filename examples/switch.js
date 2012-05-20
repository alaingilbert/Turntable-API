/**
 * On/Off bot switch with basic variables in nodejs
 */

var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

// Define default value for non-global variable 'status' (1 is on, 0 is off)
status = 1;

bot.on('speak', function (data) {
   var name = data.name;
   var text = data.text;
   
//If the bot is ON
   if (status == 1) {
        if (text.match(/^\/status$/)) {
        bot.speak('The bot is currently turned on.');
		}

        if (text.match(/^\/off$/)) {
        bot.speak('The bot is turned now off.');
		// Set the status to off
		status = 0;
		}
		
		// ADD other functions here for when the bot is turned on. Like, for example:
		// Respond to "/hello" command
        if (text.match(/^\/hello$/)) {
        bot.speak('Hey! How are you @'+name+' ?');
		}
   }
   
//If the bot is OFF
   if (status == 0) {
        if (text.match(/^\/status$/)) {
        bot.speak('The bot is currently turned off.');
		}
		
        if (text.match(/^\/on$/)) {
        bot.speak('The bot is turned now on.');
		// Set the status to on
		status = 1;
        }
		
       	// ADD other functions here for when the bot is turned off.
   }
   
});
