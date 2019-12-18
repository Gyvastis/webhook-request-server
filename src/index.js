const amqp = require('amqplib/callback_api');
const work = require('./index.process');

if(!process.env.CLOUDAMQP_URL) {
  throw new Error('CLOUDAMQP_URL environment variable is not defined.');
}

const exchange = 'webhook';
const requestQueue = 'webhook_request';

let amqpConn = null;
const start = () => {
  amqp.connect(process.env.CLOUDAMQP_URL + '?heartbeat=60', (err, conn) => {
    if (err) {
      console.error('[AMQP]', err.message);
      return setTimeout(start, 1000);
    }

    conn.on('error', err => {
      if (err.message !== 'Connection closing') {
        console.error('[AMQP] conn error', err.message);
      }
    });

    conn.on('close', () => {
      console.error('[AMQP] reconnecting');
      return setTimeout(start, 1000);
    });

    console.log('[AMQP] connected');
    amqpConn = conn;
    whenConnected();
  });
}

const whenConnected = () => {
  startWorker();
  startPublisher();
}

let pubChannel = null;
const startPublisher = () => {
  amqpConn.createConfirmChannel((err, ch) => {
    if (closeOnErr(err)) return;
      ch.on('error', err => {
      console.error('[AMQP] channel error', err.message);
    });

    ch.on('close', () => {
      console.log('[AMQP] channel closed');
    });

    console.log('Publisher is started');
    pubChannel = ch;
  });
}

const startWorker = () => {
  amqpConn.createChannel((err, ch) => {
    if (closeOnErr(err)) return;

    ch.on('error', err => {
      console.error('[AMQP] channel error', err.message);
    });

    ch.on('close', () => {
      console.log('[AMQP] channel closed');
    });

    ch.prefetch(10);
    ch.assertQueue(requestQueue, { durable: true }, err => {
      if (closeOnErr(err)) return;
      ch.consume(requestQueue, processMsg, { noAck: false });
      console.log('Worker is started');
    });

    const processMsg = msg => {
      work(msg, ok => {
        try {
          if (ok) {
            ch.ack(msg);
          }
          else {
            ch.reject(msg, true);
          }
        } catch (e) {
          closeOnErr(e);
        }
      }, (routingKey, content) => {
        pubChannel.publish(exchange, routingKey, Buffer.from(content), { persistent: true }, (err, ok) => {
          if (!err) return;
          console.error('[AMQP] publish', err);
          pubChannel.connection.close();
        });
      });
    }
  });
}

const closeOnErr = err => {
  if (!err) return false;

  console.error('[AMQP] error', err);
  amqpConn.close();

  return true;
}

start();
