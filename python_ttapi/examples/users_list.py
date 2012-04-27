from ttapi import Bot

AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
bot = Bot(AUTH, USERID, ROOMID)

theUsersList = { }

def roomChanged(data):
   global theUsersList
   # Reset the users list
   theUsersList = {}
   users = data['users']
   for user in users:
      theUsersList[user['userid']] = user


def registered(data):
   global theUsersList
   user = data['user'][0]
   theUsersList[user['userid']] = user


def deregistered(data):
   global theUsersList
   user = data['user'][0]
   del theUsersList[user['userid']]


bot.on('roomChanged',  roomChanged)
bot.on('registered',   registered)
bot.on('deregistered', deregistered)

bot.start()
