class Logger {
  constructor(options = {}) {
    this.service = options.service || 'AI-Visualization';
    this.level = options.level || 'info';
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logFile = options.logFile || './logs/visualization.log';
    this.logs = [];
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.lastError = null;
  }

  _shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const current = levels.indexOf(this.level);
    const message = levels.indexOf(level);
    return message >= current;
  }

  _log(level, message, data = null) {
    if (!this._shouldLog(level)) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.service,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };
    
    this.logs.push(entry);
    if (this.logs.length > this.maxBufferSize) {
      this.logs.shift();
    }
    
    if (this.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${entry.service}] ${entry.level}: ${entry.message}`);
    }
    
    if (this.enableFile && data) {
      const fs = require('fs');
      const dir = require('path').dirname(this.logFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    }
  }

  debug(message, data) { this._log('debug', message, data); }
  info(message, data) { this._log('info', message, data); }
  warn(message, data) { this._log('warn', message, data); }
  error(message, data) { this._log('error', message, data); }

  getLogs(level, limit) {
    let filtered = this.logs;
    if (level && level !== 'all') filtered = this.logs.filter(l => l.level === level.toUpperCase());
    return filtered.slice(-limit || filtered.length);
  }

  clearLogs() {
    this.logs = [];
    this.lastError = null;
  }
}

let globalLogger = null;

function getLogger(options = {}) {
  if (!globalLogger) {
    globalLogger = new Logger(options);
  }
  return globalLogger;
}

module.exports = { Logger, getLogger };