import * as angularCore from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

const createZonelessTestModule = () => {
  const provideZonelessChangeDetection =
    (angularCore as any).provideZonelessChangeDetection ||
    (angularCore as any).provideExperimentalZonelessChangeDetection;

  if (typeof provideZonelessChangeDetection !== 'function') {
    return null;
  }

  @angularCore.NgModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: angularCore.ErrorHandler,
        useValue: {
          handleError: (error: unknown) => {
            throw error;
          },
        },
      },
    ],
  })
  class ZonelessTestModule {}

  return ZonelessTestModule;
};

export const ensureTestBed = () => {
  const testBed = getTestBed();
  if (testBed.platform && testBed.ngModule) {
    return;
  }

  const modules: any[] = [BrowserDynamicTestingModule];
  if (typeof (globalThis as any).Zone === 'undefined') {
    const zonelessTestModule = createZonelessTestModule();
    if (zonelessTestModule) {
      modules.push(zonelessTestModule);
    }
  }

  testBed.initTestEnvironment(modules, platformBrowserDynamicTesting());
};
