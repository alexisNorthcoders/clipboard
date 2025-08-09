const logger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    
    const duration = Date.now() - start;
    const userAgent = req.get('User-Agent') || 'unknown-agent';
    const status = res.statusCode;

    let statusType = 'INFO';

    if (status >= 500) statusType = 'SERVER ERROR';
    else if (status >= 400) statusType = 'CLIENT ERROR';
    else if (status >= 300) statusType = 'REDIRECTION';
    else if (status >= 200) statusType = 'SUCCESS';

    console.log(
      `[${new Date().toISOString()}] [${statusType}] ${req.method} ${req.originalUrl} ${status} - ${duration}ms - User-Agent: ${userAgent}`
    );
  });

  next();
};

module.exports = { logger };
