function getPrefix(path) {
  const index = path.indexOf(':');
  if (index === -1) {
    return path;
  }

  return path.substring(0, index);
}

class RouteContext {
  constructor(route, params) {
    this.route = route;
    this.params = params;
  }
}

function compileToRegex(path) {
  // 将路径中的动态参数 :param 替换为正则表达式捕获组 ([^/]+)
  const regexPattern = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        return '([^/]+)';
      }
      return segment;
    })
    .join('/');

  // 包装为完整的正则表达式
  return new RegExp(`^${regexPattern}$`);
}

const PREFIX = Symbol("PREFIX");
const PATTERN = Symbol("PATTERN");

export default class OptimizedRouter {
  constructor(router) {
    this.staticRoutesMapping = new Map();
    router.routes.filter((d) => {
      return d.isDynamic === false;
    }).forEach((d) => {
      this.staticRoutesMapping.set(`${d.method}@${d.path}`, d);
    });

    this.dynamicRoutes = new Map();
    this.dynamicRoutes.set('HEAD', []);
    this.dynamicRoutes.set('GET', []);
    this.dynamicRoutes.set('POST', []);
    this.dynamicRoutes.set('PUT', []);
    this.dynamicRoutes.set('DELETE', []);
    this.dynamicRoutes.set('PATCH', []);
    this.dynamicRoutes.set('OPTIONS', []);

    // TODO: 动态路由重复定义判断
    router.routes.filter((d) => {
      return d.isDynamic === true;
    }).forEach((d) => {
      const routes = this.dynamicRoutes.get(d.method);
      const prefix = getPrefix(d.path);
      d[PREFIX] = prefix;
      // 使用新方法编译正则表达式
      d[PATTERN] = compileToRegex(d.path);
      routes.push(d);
    });
  }

  dispatch(method, path) {
    // dispatch from static routes
    if (this.staticRoutesMapping.has(`${method}@${path}`)) {
      console.log(`dispatch from static routes(%s %s)`, method, path);
      const route = this.staticRoutesMapping.get(`${method}@${path}`);
      return new RouteContext(route, {});
    }

    // dispatch from dynamic routes
    const routes = this.dynamicRoutes.get(method);
    if (!routes || routes.length === 0) {
      return null;
    }

    for (const route of routes) {
      // 先检查前缀
      if (path.startsWith(route[PREFIX])) {
        console.log(route[PATTERN]);
        const matched = path.match(route[PATTERN]);
        if (matched) {
          console.log(matched);
          console.log(`dispatch from dynamic routes(%s %s)`, method, path);
          const params = {};
          route.params.forEach((param, index) => {
            params[param] = matched[index + 1];
          });
          return new RouteContext(route, params);
        }
      }
    }

    return null;
  }
}
