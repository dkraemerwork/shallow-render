import { ensureAngularSingleton } from './lib/tools/angular-singleton';

ensureAngularSingleton();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const shallowModule = require('./lib/shallow') as typeof import('./lib/shallow');

export const Shallow = shallowModule.Shallow;
export type { RecursivePartial } from './lib/models/recursive-partial';
