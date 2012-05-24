/**
 * Each time a song starts, the bot vote up.
 * WARNING: Turntable no longer allows bots that autobop. This script is provided for educational purposes only.
 * For more information, visit http://faq.turntable.fm/customer/portal/articles/258935
 */

var Bot    = require('../index');
var AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var bot = new Bot(AUTH, USERID, ROOMID);

bot.on('newsong', function (data) { bot.bop(); });
