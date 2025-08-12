const EventEmitter = require('events');

class NoOpEmitter {
  on() { return this; }
  emit() { return false; }
  off() { return this; }
  once() { return this; }
}

const isEnabled = process.env.ENABLE_EVENTS === 'true';

const observer = isEnabled ? new EventEmitter() : new NoOpEmitter();

module.exports = observer;