import { Type, ɵdepsTracker } from '@angular/core';

type ComponentDef = {
  dependencies?: any;
  directiveDefs?: any;
  pipeDefs?: any;
  [key: string]: any;
};

const ORIGINAL_DEPENDENCIES = '__shallowOriginalDependencies';
const ORIGINAL_DIRECTIVE_DEFS = '__shallowOriginalDirectiveDefs';
const ORIGINAL_PIPE_DEFS = '__shallowOriginalPipeDefs';

const getComponentDef = (component: Type<any>) => (component as any).ɵcmp as ComponentDef | undefined;
const depsTracker: { clearScopeCacheFor?: (type: unknown) => void } = ɵdepsTracker as any;

const normalizeDependencies = (dependencies: any) => {
  const resolved = typeof dependencies === 'function' ? dependencies() : dependencies;
  if (!resolved) {
    return [];
  }
  const list = Array.isArray(resolved) ? resolved : Array.from(resolved as Iterable<any>);
  return list.map(dep => dep?.type || dep).filter(Boolean);
};

const extractDirectiveDef = (dependency: any) => dependency?.ɵcmp || dependency?.ɵdir || null;
const extractPipeDef = (dependency: any) => dependency?.ɵpipe || null;

const createDefListFactory = (dependencies: any, extractor: (dependency: any) => any) => {
  if (!dependencies) {
    return null;
  }
  return () => {
    const resolved = typeof dependencies === 'function' ? dependencies() : dependencies;
    if (!resolved) {
      return [];
    }
    const list = Array.isArray(resolved) ? resolved : Array.from(resolved as Iterable<any>);
    const result = [];
    for (const dep of list) {
      const def = extractor(dep);
      if (def) {
        result.push(def);
      }
    }
    return result;
  };
};

export const getStandaloneComponentImports = (component: Type<any>) => {
  const def = getComponentDef(component);
  if (!def) {
    return undefined;
  }
  const originalDependencies = def[ORIGINAL_DEPENDENCIES] ?? def.dependencies;
  if (!originalDependencies) {
    return undefined;
  }
  return normalizeDependencies(originalDependencies);
};

export const overrideStandaloneComponentImports = (component: Type<any>, mockedImports: any[]) => {
  const def = getComponentDef(component);
  if (!def) {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(def, ORIGINAL_DEPENDENCIES)) {
    Object.defineProperty(def, ORIGINAL_DEPENDENCIES, { value: def.dependencies, writable: true });
    Object.defineProperty(def, ORIGINAL_DIRECTIVE_DEFS, { value: def.directiveDefs, writable: true });
    Object.defineProperty(def, ORIGINAL_PIPE_DEFS, { value: def.pipeDefs, writable: true });
  }

  const originalDependencies = def[ORIGINAL_DEPENDENCIES];
  def.dependencies = typeof originalDependencies === 'function' ? () => mockedImports : mockedImports;
  def.directiveDefs = createDefListFactory(def.dependencies, extractDirectiveDef);
  def.pipeDefs = createDefListFactory(def.dependencies, extractPipeDef);
  depsTracker.clearScopeCacheFor?.(component);
  return true;
};
