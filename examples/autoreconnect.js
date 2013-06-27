//  .d8888b.  888    888        d8888 88888888888 88888888888 Y88b   d88P 
// d88P  Y88b 888    888       d88888     888         888      Y88b d88P  
// 888    888 888    888      d88P888     888         888       Y88o88P   
// 888        8888888888     d88P 888     888         888        Y888P    
// 888        888    888    d88P  888     888         888         888     
// 888    888 888    888   d88P   888     888         888         888     
// Y88b  d88P 888    888  d8888888888     888         888         888     
//  "Y8888P"  888    888 d88P     888     888         888         888                                                                    
//
// ChattyTT - Copyright (C) 2013 B^Dub - dubbytt@gmail.com - Last update June 15th 2013
// (subset of Chatty's 3000+ lines of code... auto reconnect code and uptime command)
//
// A Turntable.fm bot that automatically reconnects to tt.fm after
// the internet connection goes away and comes back, or tt.fm goes down
// for maintenance and comes back. Responds to /uptime command and will 
// report uptime, how many times it has been down and how long the last time was.
//
// This software is best viewed with Sublime Text http://www.sublimetext.com
//
// ASCII GEN http://patorjk.com/software/taag/#p=display&f=Colossal&t=STALKBOT
//-----------------------------------------------------------------------------

var Bot = require('ttapi');
// FIGURE OUT YOUR AUTH, USERID, ROOMID with this tool: 
// http://alaingilbert.github.io/Turntable-API/bookmarklet.html
var AUTH = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx';
var BOTNAME = 'ChattyTT';
var ADMIN = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var netwatchdogTimer = null; // Used to detect internet connection dropping out
var startTime = Date.now(); // Holds start time of the bot
var reLogins = 0; // The number of times the bot has re-logged on due to internet/tt.fm outage.
var botDownDATEtime = ""; // The time/date the bot went down.
var botDownUTCtime = 0; // Used to save the UTC time the bot went down.
var botDowntime = 0; // Used to save the duration of time the bot was down for last.

var bot = new Bot(AUTH, USERID, ROOMID);
// set this to 'true' to see lots and LOTS of debug data :-/
bot.debug = false;

// 8888888b.  8888888888        d8888 8888888b. Y88b   d88P 
// 888   Y88b 888              d88888 888  "Y88b Y88b d88P  
// 888    888 888             d88P888 888    888  Y88o88P   
// 888   d88P 8888888        d88P 888 888    888   Y888P    
// 8888888P"  888           d88P  888 888    888    888     
// 888 T88b   888          d88P   888 888    888    888     
// 888  T88b  888         d8888888888 888  .d88P    888     
// 888   T88b 8888888888 d88P     888 8888888P"     888    
bot.on('ready', function () {
  console.log("[ " + BOTNAME + " is READY FREDDY! on " + Date() + " ] ");
});

//  .d8888b.  8888888b.  8888888888        d8888 888    d8P  
// d88P  Y88b 888   Y88b 888              d88888 888   d8P   
// Y88b.      888    888 888             d88P888 888  d8P    
//  "Y888b.   888   d88P 8888888        d88P 888 888d88K     
//     "Y88b. 8888888P"  888           d88P  888 8888888b    
//       "888 888        888          d88P   888 888  Y88b   
// Y88b  d88P 888        888         d8888888888 888   Y88b  
//  "Y8888P"  888        8888888888 d88P     888 888    Y88b 
bot.on('speak', function (data) {
  //log chat to the console
  console.log(data.name + ': ' + data.text);
  data.text = data.text.trim(); //Get rid of any surrounding whitespace

  // Respond to "uptime" command
  if (data.text.match(/^\/uptime$/i)) {
    upTime(data, false);
  }
});

// 8888888b.  888b     d888 888b     d888 8888888888 8888888b.  
// 888   Y88b 8888b   d8888 8888b   d8888 888        888  "Y88b 
// 888    888 88888b.d88888 88888b.d88888 888        888    888 
// 888   d88P 888Y88888P888 888Y88888P888 8888888    888    888 
// 8888888P"  888 Y888P 888 888 Y888P 888 888        888    888 
// 888        888  Y8P  888 888  Y8P  888 888        888    888 
// 888        888   "   888 888   "   888 888        888  .d88P 
// 888        888       888 888       888 8888888888 8888888P"  
bot.on('pmmed', function (data) {
  // Respond to "uptime" command
  if (data.text.match(/^\/uptime$/i)) {
    upTime(data, true);
  }
});

// 8888888b. 8888888 .d8888b.   .d8888b.   .d88888b.  888b    888 888b    888 8888888888 .d8888b. 88888888888 8888888888 8888888b.
// 888  "Y88b  888  d88P  Y88b d88P  Y88b d88P" "Y88b 8888b   888 8888b   888 888       d88P  Y88b    888     888        888  "Y88b
// 888    888  888  Y88b.      888    888 888     888 88888b  888 88888b  888 888       888    888    888     888        888    888
// 888    888  888   "Y888b.   888        888     888 888Y88b 888 888Y88b 888 8888888   888           888     8888888    888    888
// 888    888  888      "Y88b. 888        888     888 888 Y88b888 888 Y88b888 888       888           888     888        888    888
// 888    888  888        "888 888    888 888     888 888  Y88888 888  Y88888 888       888    888    888     888        888    888
// 888  .d88P  888  Y88b  d88P Y88b  d88P Y88b. .d88P 888   Y8888 888   Y8888 888       Y88b  d88P    888     888        888  .d88P
// 8888888P" 8888888 "Y8888P"   "Y8888P"   "Y88888P"  888    Y888 888    Y888 8888888888 "Y8888P"     888     8888888888 8888888P"
bot.on('disconnected', function (data) { // Loss of connection detected, takes about 20 seconds
  console.log("[ BOT WAS DISCONNECTED ]: " + data + " on " + Date());
  botDownDATEtime = Date(); // save the down date/time.
  botDownUTCtime = Date.now(); // save the UTC time the bot went down.
  setTimeout(function () {
    startWatchdog();
  }, 10 * 1000); // give the bot 10 seconds to fully fail before attempting to reconnect
});

//        d8888 888      8888888 888     888 8888888888 
//       d88888 888        888   888     888 888        
//      d88P888 888        888   888     888 888        
//     d88P 888 888        888   Y88b   d88P 8888888    
//    d88P  888 888        888    Y88b d88P  888        
//   d88P   888 888        888     Y88o88P   888        
//  d8888888888 888        888      Y888P    888        
// d88P     888 88888888 8888888     Y8P     8888888888 
bot.on('alive', function () { // Reset the watchdog timer if bot is alive
  if (netwatchdogTimer != null) {
    clearTimeout(netwatchdogTimer);
    netwatchdogTimer = null;
  }
});

// 8888888888 888     888 888b    888  .d8888b.  d8b         
// 888        888     888 8888b   888 d88P  Y88b 88P         
// 888        888     888 88888b  888 888    888 8P          
// 8888888    888     888 888Y88b 888 888        "  .d8888b  
// 888        888     888 888 Y88b888 888           88K      
// 888        888     888 888  Y88888 888    888    "Y8888b. 
// 888        Y88b. .d88P 888   Y8888 Y88b  d88P         X88 
// 888         "Y88888P"  888    Y888  "Y8888P"      88888P' 
function upTime(data, pm) {
  var timeNow = Date.now();
  var upTime = timeNow - startTime;
  var utHours = Math.floor(upTime / (1000 * 3600));
  var utMins = Math.floor((upTime % (3600 * 1000)) / (1000 * 60));
  var utSecs = Math.floor((upTime % (60 * 1000)) / 1000);
  if (reLogins > 0) var relogins = " and gracefully re-logged on due to internet / tt.fm outages " + reLogins + " time(s). Was last down for " + botDowntime + " second(s)";
  else var relogins = "";
  if (utHours > 0) {
    if (pm) bot.pm("I've been slaving away for " + utHours + " hour(s) " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins, data.senderid);
    else bot.speak("/me has been slaving away for " + utHours + " hour(s) " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins);
  } else if (utMins > 0) {
    if (pm) bot.pm("I've been slaving away for " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins, data.senderid);
    else bot.speak("/me has been slaving away for " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins);
  } else {
    if (pm) bot.pm("I've been slaving away for " + utSecs + " second(s) now!" + relogins, data.senderid);
    else bot.speak("/me has been slaving away for " + utSecs + " second(s) now!" + relogins);
  }
}

function startWatchdog() { // Start the watchdog timer
  if (netwatchdogTimer == null) {
    netwatchdogTimer = setInterval(function () {
      console.log("[ WAITING FOR INTERNET/TT.FM TO COME BACK!!! ]");
      bot.roomRegister(ROOMID, function (data) {
        if (data && data.success) {
          console.log("[ I'M BACK!!!! WEEEEEEEeeeeeeeeee!!! ]");
          botDowntime = (Date.now() - botDownUTCtime) / 1000;
          reLogins += 1; // Increment the reLogin counter.
          bot.pm("NET/TT.FM WAS DOWN on " + botDownDATEtime + " for " + botDowntime + " second(s)", ADMIN);
          console.log("[ NET/TT.FM WAS DOWN on " + botDownDATEtime + " for " + botDowntime + " second(s) ]");
          // Here you can re-initialize things if you need to, like re-loading a queue
          // ...
        }
      });
    }, 10 * 1000); // Try to log back in every 10 seconds
  }
}
