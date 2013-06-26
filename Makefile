FILES = lib/bot.js node_modules/ttapi-errors/lib/errors.js
all: ${FILES}

lib/bot.js: src/bot.coffee
	coffee -pc $< > $@

node_modules/ttapi-errors/lib/errors.js: src/errors.coffee
	@mkdir -p `basename $@`
	coffee -pc $< > $@

clean:
	rm -f ${FILES}
