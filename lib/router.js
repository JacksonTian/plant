export default class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  get(path, handler) {
    this.routes.push({
      method: 'GET',
      path,
      handler
    });
  }
}
