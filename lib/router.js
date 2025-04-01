export default class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  get(path, handle) {
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
      method: 'GET',
      path,
      handle,
      isDynamic, // 新增字段，标记是否为动态路由
      params    // 新增字段，存储动态参数名
    });
  }
}