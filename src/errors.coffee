util = require 'util'

class AbstractError extends Error
  constructor: (msg, constr) ->
    # If defined, pass the constr property to V8's
    # captureStackTrace to clean up the output
    Error.captureStackTrace @, constr ? @

    @message = msg ? 'Error'

AbstractError::name = 'Abstract Error'

class ConnectionError extends AbstractError
  constructor: (msg) ->
    super msg, @constructor

ConnectionError::name = 'Connection Error'

class SocketError extends AbstractError
  constructor: (err) ->
    super err.message, err.constructor

SocketError::name = 'Socket Error'

class TimeoutError extends AbstractError
  constructor: (msg) ->
    super msg, @constructor

TimeoutError::name = 'Timeout Error'


exports.AbstractError   = AbstractError
exports.ConnectionError = ConnectionError
exports.SocketError     = SocketError
exports.TimeoutError    = TimeoutError
