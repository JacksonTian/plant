const requestBody = Symbol('body');

function readAll(readable) {
  return new Promise((resolve, reject) => {
    var onError, onData, onEnd;
    var cleanup = function () {
      // cleanup
      readable.removeListener('error', onError);
      readable.removeListener('data', onData);
      readable.removeListener('end', onEnd);
    };

    var bufs = [];
    var size = 0;

    onData = function (buf) {
      bufs.push(buf);
      size += buf.length;
    };

    onError = function (err) {
      cleanup();
      reject(err);
    };

    onEnd = function () {
      cleanup();
      resolve(Buffer.concat(bufs, size));
    };

    readable.on('error', onError);
    readable.on('data', onData);
    readable.on('end', onEnd);
  });
};

export default class Contenxt {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.body = '';
  }

  get searchParams() {
    const url = new URL(this.req.url, `http://${this.req.headers.host}`);
    return url.searchParams;
  }

  get method() {
    return this.req.method;
  }

  get path() {
    const [path] = this.url.split('?');
    return path;
  }

  get url() {
    return this.req.url;
  }

  async getRequestBody() {
    if (typeof this[requestBody] !== 'undefined') {
      return this[requestBody];
    }

    if (this.req.method === 'GET' || this.req.method === 'HEAD') {
      return null;
    }

    if (this.req.headers['content-length'] === '0') {
      return null;
    }

    this[requestBody] = await readAll(this.req);
    return this[requestBody];
  }
}
