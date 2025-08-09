const logger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {

        if (req.originalUrl.startsWith('/assets/') ||
            req.originalUrl.endsWith('.js') ||
            req.originalUrl.endsWith('.css')) {
            return
        }
        const duration = Date.now() - start;
        const userAgent = req.get('User-Agent') || 'unknown-agent';

        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - User-Agent: ${userAgent}`
        );
    });

    next();
}

module.exports = { logger };