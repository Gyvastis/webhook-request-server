const amqp = require('amqplib/callback_api');
const work = require('./index.process');

// if the connection is closed or fails to be established at all, we will reconnect
let amqpConn = null;
const start = () => {
  amqp.connect(process.env.CLOUDAMQP_URL + '?heartbeat=60', function(err, conn) {
    if (err) {
      console.error('[AMQP]', err.message);
      return setTimeout(start, 1000);
    }

    conn.on('error', function(err) {
      if (err.message !== 'Connection closing') {
        console.error('[AMQP] conn error', err.message);
      }
    });

    conn.on('close', function() {
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
}

function startWorker() {
  amqpConn.createChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    
    ch.on('error', function(err) {
      console.error('[AMQP] channel error', err.message);
    });

    ch.on('close', function() {
      console.log('[AMQP] channel closed');
    });

    ch.prefetch(10);

    ch.assertQueue('webhook_request', { durable: true }, function(err, _ok) {
      if (closeOnErr(err)) return;

      ch.consume('webhook_request', processMsg, { noAck: false });

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
