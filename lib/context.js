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
}
