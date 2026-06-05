export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true
  }
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production'

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details !== null && { details: err.details }),
    })
  }

  console.error('[FATAL]', err)

  res.status(err.statusCode || 500).json({
    success: false,
    error: isDev ? err.message : 'erreur interne du serveur',
    ...(isDev && err.stack && { stack: err.stack }),
  })
}

export default errorHandler
