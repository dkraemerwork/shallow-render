import { TestBed } from '@angular/core/testing';
import { createTestModule } from './create-test-module';
import { mockStatics } from './mock-statics';
import { injectRootProviders } from './inject-root-providers';
import { TestSetup } from '../models/test-setup';
import { ensureTestBed } from './ensure-testbed';

export const createService = <TService>(setup: TestSetup<TService>) => {
  ensureTestBed();
  mockStatics(setup);
  injectRootProviders(setup);

  TestBed.configureTestingModule({ imports: [createTestModule(setup)] });

  return {
    instance: TestBed.inject(setup.testComponentOrService),
    inject: TestBed.inject.bind(TestBed),
  };
};
