#
# Each time a song starts, the bot vote up.
# WARNING: Turntable no longer allows bots that autobop. This script is provided for educational purposes only.
# For more information, visit http://faq.turntable.fm/customer/portal/articles/258935
#

from ttapi import Bot

AUTH   = 'auth+live+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
USERID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
ROOMID = 'xxxxxxxxxxxxxxxxxxxxxxxx'
bot = Bot(AUTH, USERID, ROOMID)

def autobop(data): bot.bop()

bot.on('newsong', autobop)

bot.start()
