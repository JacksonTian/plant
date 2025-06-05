export default class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  #addRoute(method, path, handle) {
    // 判断路径中是否包含动态参数
    const params = [];
    const isDynamic = path.includes(':');
    if (isDynamic) {
      const pathSegments = path.split('/');
      pathSegments.forEach(segment => {
        if (segment.startsWith(':')) {
          params.push(segment.slice(1)); // 去掉冒号并记录参数名
        }
      });
    }

    this.routes.push({
      method,
      path,
      handle,
      isDynamic, // 新增字段，标记是否为动态路由
      params    // 新增字段，存储动态参数名
    });
  }

  get(path, handle) {
    this.#addRoute('GET', path, handle);
  }

  post(path, handle) {
    this.#addRoute('POST', path, handle)
  }

  put(path, handle) {
    this.#addRoute('PUT', path, handle)
  }

  delete(path, handle) {
    this.#addRoute('DELETE', path, handle)
  }

  patch(path, handle) {
    this.#addRoute('PATCH', path, handle)
  }

  options(path, handle) {
    this.#addRoute('OPTIONS', path, handle)
  }

  head(path, handle) {
    this.#addRoute('HEAD', path, handle)
  }
}

export class RouteContext {
  constructor(route, params) {
    this.route = route;
    this.params = params;
  }
}