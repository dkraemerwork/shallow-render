declare const require: any;
declare const process: { cwd: () => string };
declare const __filename: string;

const ANGULAR_PACKAGES = [
  '@angular/core',
  '@angular/core/testing',
  '@angular/common',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic/testing',
];

const getCache = () => require.cache as Record<string, any>;

export const ensureAngularSingleton = () => {
  const globalKey = '__shallowRenderAngularSingleton__';
  const globalAny = globalThis as unknown as Record<string, boolean>;
  if (globalAny[globalKey]) {
    return;
  }
  globalAny[globalKey] = true;

  const createRequire = require('module').createRequire as (path: string) => any;
  const requireFromCwd = createRequire(`${process.cwd()}/`);
  const localRequire = createRequire(__filename);

  ANGULAR_PACKAGES.forEach(packageName => {
    try {
      const hostPath = requireFromCwd.resolve(packageName);
      const localPath = localRequire.resolve(packageName);
      if (hostPath === localPath) {
        return;
      }
      const cache = getCache();
      requireFromCwd(packageName);
      const hostModule = cache[hostPath];
      if (hostModule) {
        cache[localPath] = hostModule;
      }
    } catch {
      return;
    }
  });
};
