const fetch = require('node-fetch');

const buildRequestOptions = request => {
  let requestOptions = {
    method: request.method,
    headers: request.headers,
  };

  if(!['GET', 'HEAD'].includes(request.method)) {
    requestOptions.body = request.body;
  }

  return requestOptions;
}

module.exports = (msg, cb) => {
  console.log('Got msg ', msg.content.toString());

  const { request, response } = JSON.parse(msg.content.toString());
  console.log(request)

  try {
    fetch(request.url, buildRequestOptions(request))
    .then(res => res.text())
    .then(data => {
      console.log('Response', data);

      // todo: call the webhook in $response
    })

    cb(true);
  }
  catch (e) {
    console.log(e)

    cb(false);
  }
};
