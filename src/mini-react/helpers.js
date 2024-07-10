export function isObject(target) {
  return target !== null && typeof target === 'object'
}

export function isDefined(target) {
  return target !== null && typeof target !== 'undefined'
}
