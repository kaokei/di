export function hasOwn(injector: any, token: any, value: any) {
  const foundValue = injector?.providerMap?.get(token)?.useCacheValue;
  return !!foundValue && foundValue === value;
}
