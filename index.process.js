const fetch = require('node-fetch');

module.exports = (msg, cb) => {
  console.log('Got msg ', msg.content.toString());

  const { request } = JSON.parse(msg.content.toString());
  console.log(request)

  try {
    fetch(request.url, {
      method: request.method,
    })
    .then(res => res.text())
    .then(data => {
      console.log(data);
    })

    cb(true);
  }
  catch (e) {
    console.log(e)

    cb(false);
  }
};
