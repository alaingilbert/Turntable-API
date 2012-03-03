#
# Auto boot people on a blacklist.
#

from bot import Bot

AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
bot = Bot(AUTH, USERID, ROOMID)

blackList = ['xxxxxxxxxxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxxxxxxxxxx']


# Someone enter the room, make sure he's not on the blacklist.
def registered(data):
   global blackList
   user = data['user'][0]
   for userId in blackList:
      if user['userid'] == userId:
         bot.boot(userId, 'You are on the blacklist.')
         break


bot.on('registered', registered)
