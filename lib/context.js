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
}
