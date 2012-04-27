from ttapi import Bot
import re

AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
bot = Bot(AUTH, USERID, ROOMID)


def speak(data):
   name = data['name']
   text = data['text']

   if re.match('/hello', text):
      bot.speak('Hey! How are you %s ?' % name)


bot.on('speak', speak)

bot.start()
