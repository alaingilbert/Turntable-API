all:
	coffee -pc src/bot.coffee | uglifyjs > lib/bot-min.js
