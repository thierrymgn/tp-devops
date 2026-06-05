import morgan from 'morgan'

const devFormat = ':method :url :status :res[content-length]B — :response-time ms'

const prodFormat =
  '{"time":":date[iso]","method":":method","url":":url",' +
  '"status"::status,"ms"::response-time,"bytes"::res[content-length]}'

const logger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    skip: (req) => process.env.NODE_ENV === 'production' && req.url === '/health',
  }
)

export default logger
