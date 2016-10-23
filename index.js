var http = require('http');
var cache = require('./cache');

var PORT = process.env.PORT || 8000;
var BART_ORIG = process.env.BART_ORIG || 'SSAN';
var BART_PLAT = process.env.BART_PLAT || '2';
var BART_KEY = process.env.BART_KEY || 'MW9S-E7SL-26DU-VV8V';

http.createServer(httpHandler).listen(PORT);

/**
 * Main HTTP Handler
 *
 * @param {any} request
 * @param {any} response
 */
function httpHandler (request, response) {
  var enableCors = !!request.headers['origin'];

  var times = cache.getCachedTime();
  if (times) {
    respond(response, times, enableCors);
  } else {
    getBartData(BART_KEY, BART_ORIG, BART_PLAT, function(data) {
      times = getTimes(data);
      cache.setCachedTime(times);
      respond(response, times, enableCors);
    });
  }
}

/**
 * Response Handler
 *
 * @param {any} response
 * @param {number[]} times
 * @param {boolean} enableCors
 */
function respond(response, times, enableCors) {
  if (enableCors) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    response.setHeader('Access-Control-Max-Age', '86400');
  }

  var data = JSON.stringify(times);
  response.writeHead(200, {
    'Cache-Control': 'public, max-age=60',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  });
  response.end(data);
}

/**
 * Parse the BART API XML and return estimated times
 *
 * @param {string} result
 * @returns {number[]} times
 */
function getTimes(result) {
  // find all the <minutes>##</minutes> in the xml string
  var matches = result.match(/([0-9]+)\<\/minutes\>/g);
  // convert them all into numbers and return the new array
  return matches && matches.map(function(time) { return parseInt(time, 10); });
}

/**
 * Get Estimated Times from BART API
 *
 * @param {string} key - BART API Key
 * @param {string} orig - Origin BART Station
 * @param {string} plat - Bart Platform
 * @param {function} callback
 */
function getBartData(key, orig, plat, callback) {
  http.get({
    host: 'api.bart.gov',
    path: '/api/etd.aspx?cmd=etd&orig=' + orig + '&plat=' + plat + '&key=' + key
  }, function(response) {
    var body = '';
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
      callback(body);
    });
  });
}