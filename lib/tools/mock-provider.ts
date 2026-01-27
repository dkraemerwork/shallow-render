import {
  APP_INITIALIZER,
  Provider,
  InjectionToken,
  TypeProvider,
  ValueProvider,
  EnvironmentProviders,
  ɵInternalEnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import { mockProviderClass } from '../models/mock-of-provider';
import { TestSetup } from '../models/test-setup';
import {
  isClassProvider,
  isExistingProvider,
  isFactoryProvider,
  isTypeProvider,
  isValueProvider,
  isPipeTransform,
  isEnvironmentProviders,
} from './type-checkers';

type ProviderLike = Provider | EnvironmentProviders | ProviderLike[];
type SingleProvider = Exclude<Provider, any[]>;

const getProvide = (provider: ProviderLike) => {
  if (!provider || (typeof provider !== 'object' && typeof provider !== 'function')) {
    return undefined;
  }
  if (Array.isArray(provider) || isEnvironmentProviders(provider)) {
    return undefined;
  }
  if (isTypeProvider(provider) || provider instanceof InjectionToken) {
    return provider;
  }
  return 'provide' in provider ? provider.provide : undefined;
};

const recursiveFindProvider = (
  haystack: ProviderLike[],
  needle: ProviderLike,
): Provider | EnvironmentProviders | undefined => {
  for (const i of haystack) {
    if (Array.isArray(i)) {
      const found = recursiveFindProvider(i, needle); // Recursion
      if (found) return found;
      continue;
    }
    if (isEnvironmentProviders(i)) {
      const found = recursiveFindProvider((i as ɵInternalEnvironmentProviders).ɵproviders as ProviderLike[], needle);
      if (found) return found;
      continue;
    }
    const provide = getProvide(i);
    const needleProvide = getProvide(needle);
    if (i === needle || (provide && needleProvide && provide === needleProvide)) {
      return i;
    }
  }
  return undefined;
};

const hasExplicitMock = (provider: ProviderLike, setup: TestSetup<any>): boolean => {
  if (Array.isArray(provider)) {
    return provider.some(p => hasExplicitMock(p, setup));
  }
  if (isEnvironmentProviders(provider)) {
    return (provider as ɵInternalEnvironmentProviders).ɵproviders.some(p => hasExplicitMock(p, setup));
  }
  const provide = getProvide(provider);
  if (!provide) {
    return false;
  }
  return setup.mocks.has(provide) || setup.mockPipes.has(provide);
};

const applyExplicitMocks = (provider: ProviderLike, setup: TestSetup<any>): ProviderLike => {
  if (Array.isArray(provider)) {
    if (!provider.some(p => hasExplicitMock(p, setup))) {
      return provider;
    }
    return provider.map(p => applyExplicitMocks(p, setup));
  }
  if (isEnvironmentProviders(provider)) {
    const providers = (provider as ɵInternalEnvironmentProviders).ɵproviders;
    if (!providers.some(p => hasExplicitMock(p, setup))) {
      return provider;
    }
    return makeEnvironmentProviders(providers.map(p => applyExplicitMocks(p, setup) as Provider));
  }
  return hasExplicitMock(provider, setup) ? (mockProvider(provider, setup) as Provider) : provider;
};

export function mockProvider(providerToMock: TypeProvider, setup: TestSetup<any>): ValueProvider | TypeProvider;
export function mockProvider<TProvider extends Provider>(providerToMock: TProvider, setup: TestSetup<any>): TProvider;
export function mockProvider(
  providerToMock: Provider | EnvironmentProviders,
  setup: TestSetup<any>,
): Provider | EnvironmentProviders;
export function mockProvider(
  providerToMock: Provider | EnvironmentProviders,
  setup: TestSetup<any>,
): Provider | EnvironmentProviders {
  if (isEnvironmentProviders(providerToMock)) {
    const providers = (providerToMock as ɵInternalEnvironmentProviders).ɵproviders;
    if (!providers.some(p => hasExplicitMock(p, setup))) {
      return providerToMock;
    }
    return makeEnvironmentProviders(providers.map(p => applyExplicitMocks(p, setup) as Provider));
  }

  const provider = recursiveFindProvider(setup.providers as ProviderLike[], providerToMock) || providerToMock;
  if (isEnvironmentProviders(provider)) {
    return provider;
  }
  if (Array.isArray(provider)) {
    return provider.map(p => mockProvider(p, setup)); // Recursion
  }

  const baseProvider = provider as SingleProvider;
  if (isExistingProvider(baseProvider)) {
    return baseProvider;
  }
  const provide = isTypeProvider(baseProvider) ? baseProvider : baseProvider.provide;
  const isPipe = isPipeTransform(provide);
  const hasMocks = setup.mocks.has(provide) || setup.mockPipes.has(provide);
  const userMocks = isPipe
    ? {
        transform: setup.mockPipes.get(provide) || (() => ''),
        ...setup.mocks.get(provide),
      }
    : setup.mocks.get(provide);

  // APP_INITIALIZERS break TestBed!
  // Do this until https://github.com/angular/angular/issues/24218 is fixed
  if (provide === APP_INITIALIZER) {
    return [];
  }

  // TODO: What if setup.dontMock.includes(provide.useClass)?
  if (!hasMocks && recursiveFindProvider(setup.dontMock, provider)) {
    return provider;
  }

  const prov = {
    provide,
    multi: 'multi' in provider && provider.multi,
  };

  if (provide instanceof InjectionToken && isValueProvider(baseProvider)) {
    return { ...prov, useValue: hasMocks ? userMocks : `MOCKED_INJECTION_TOKEN_VALUE - ${provide.toString()}` };
  }

  const MockProvider = mockProviderClass(isClassProvider(baseProvider) ? baseProvider.useClass : provide, userMocks);

  if (isClassProvider(baseProvider)) {
    return { ...prov, useClass: MockProvider };
  }
  if (isFactoryProvider(baseProvider)) {
    return { ...prov, useFactory: () => new MockProvider() };
  }
  return { ...prov, useValue: new MockProvider() };
}
