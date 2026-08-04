const fs = require('fs');
const path = require('path');

const instances = new Map();

class Logger {
  constructor(options = {}) {
    this.service = options.service || 'VisionAI';
    this.level = options.level || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.buffer = [];
    this.maxBuffer = 1000;
  }

  _log(level, message, data) {
    if (this.levels[level] > this.levels[this.level]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.service,
      level,
      message,
      data: data || null,
    };
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
    const prefix = `[${entry.timestamp}] [${this.service}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`, data ? JSON.stringify(data).substring(0, 200) : '');
  }

  error(message, data) { this._log('error', message, data); }
  warn(message, data) { this._log('warn', message, data); }
  info(message, data) { this._log('info', message, data); }
  debug(message, data) { this._log('debug', message, data); }

  getBuffer() { return this.buffer; }
  getRecent(count = 50) { return this.buffer.slice(-count); }
}

function getLogger(options = {}) {
  const key = options.service || 'default';
  if (!instances.has(key)) {
    instances.set(key, new Logger(options));
  }
  return instances.get(key);
}

module.exports = { Logger, getLogger };