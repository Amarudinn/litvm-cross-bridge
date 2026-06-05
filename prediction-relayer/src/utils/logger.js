import winston from 'winston';
import config from '../config.js';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logDir, 'combined.log'),
    }),
  ],
});

export default logger;
