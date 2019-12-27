const fetch = require('node-fetch');
const proxyAgents = {
  http: require('http-proxy-agent'),
  https: require('https-proxy-agent'),
  socks4: require('socks-proxy-agent'),
  socks5: require('socks-proxy-agent'),
};
const Promise = require('bluebird');
fetch.Promise = Promise;

const buildRequestOptions = request => {
  let requestOptions = {
    method: request.method,
    headers: request.headers,
    timeout: request.timeout ?: 10000,
  };

  if(request.proxy) {
    requestOptions.agent = new proxyAgents[request.proxy.protocol](`${request.proxy.protocol}://${request.proxy.ip}:${request.proxy.port}`);
  }

  if(!['GET', 'HEAD'].includes(request.method)) {
    requestOptions.body = request.body;
  }

  return requestOptions;
}

module.exports = (msg, cb, publishResponse) => {
  console.log('Got msg ', msg.content.toString());

  const { request, response, requeue } = JSON.parse(msg.content.toString());
  console.log(request)

  try {
    fetch(request.url, buildRequestOptions(request))
    .then(res => res.text())
    .then(data => {
      console.log('Response', data);

      if(requeue) {
        console.log('Requeue', data);
        publishResponse(requeue.routingKey, data);
      }
      else {
        fetch(response.url, buildRequestOptions({
          ...response,
          body: data
        }))
        .then(res => res.text())
        .then(data => {
          console.log('Webhook', data);
        })
      }
    })

    cb(true);
  }
  catch (e) {
    console.log(e)

    cb(false);
  }
};
