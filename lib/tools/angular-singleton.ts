import { createRequire } from 'node:module';

const ANGULAR_PACKAGES = [
  '@angular/core',
  '@angular/core/testing',
  '@angular/common',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic/testing',
];

const getCache = () => (require as NodeRequire).cache;

export const ensureAngularSingleton = () => {
  const globalKey = '__shallowRenderAngularSingleton__';
  const globalAny = globalThis as { [key: string]: boolean };
  if (globalAny[globalKey]) {
    return;
  }
  globalAny[globalKey] = true;

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
