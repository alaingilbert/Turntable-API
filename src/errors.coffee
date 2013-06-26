util = require 'util'

class AbstractError extends Error
  constructor: (msg, constr) ->
    # If defined, pass the constr property to V8's
    # captureStackTrace to clean up the output
    Error.captureStackTrace @, constr ? @

    @message = msg ? 'Error'

AbstractError::name = 'AbstractError'

class ConnectionError extends AbstractError
  constructor: (msg) ->
    super msg, @constructor

ConnectionError::name = 'ConnectionError'

class SocketError extends AbstractError
  constructor: (err) ->
    super err.message, err.constructor

SocketError::name = 'SocketError'

class TimeoutError extends AbstractError
  constructor: (msg) ->
    super msg, @constructor

TimeoutError::name = 'TimeoutError'


exports.AbstractError   = AbstractError
exports.ConnectionError = ConnectionError
exports.SocketError     = SocketError
exports.TimeoutError    = TimeoutError
