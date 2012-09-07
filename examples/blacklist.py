#
# Auto boot people on a blacklist.
#

from ttapi import Bot

AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
bot = Bot(AUTH, USERID, ROOMID)


blackList = set(['xxxxxxxxxxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxxxxxxxxxx'])


# Someone enter the room, make sure he's not on the blacklist.
def registered(data):
   global blackList
   user = data['user'][0]
   if user['userid'] in blackList:
      bot.boot(userId, 'You are on the blacklist.')


bot.on('registered', registered)

bot.start()
