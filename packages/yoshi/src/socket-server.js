const EventEmitter = require('events');
const http = require('http');
const sockjs = require('sockjs');

module.exports = class SocketServer extends EventEmitter {
  constructor() {
    super();

    this.connection = null;

    this.server = http.createServer();
    this.socket = sockjs.createServer();

    this.socket.installHandlers(this.server, { prefix: '/_yoshi_server_hmr_' });

    this.socket.on('connection', connection => {
      this.connection = connection;

      connection.on('data', message => {
        this.emit('message', JSON.parse(message));
      });

      connection.on('close', () => {
        if (this.connection === connection) {
          this.connection = null;
        }
      });
    });
  }

  send(message) {
    this.connection.write(JSON.stringify(message));
  }

  async initialize() {
    if (!this.server.listening) {
      await new Promise((resolve, reject) => {
        this.server.listen(4000, 'localhost', err =>
          err ? reject(err) : resolve(),
        );
      });
    }
  }
};
