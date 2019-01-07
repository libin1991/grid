export const arrayPush = Array.prototype.push;
export const hasOwnProperty = Object.prototype.hasOwnProperty;
export const gSBU = 'getSnapshotBeforeUpdate';
export const gDSFP = 'getDerivedStateFromProps';
export const hasSymbol = typeof Symbol === 'function' && Symbol['for'];
export const effects = [];
export const topFibers = [];
export const topNodes = [];
export const emptyObject = {};

export const REACT_ELEMENT_TYPE = hasSymbol
  ? Symbol['for']('react.element')
  : 0xeac7;

export function noop() {}

export function returnFalse() {
  return false;
}

export function resetStack(info) {
  keepLast(info.containerStack);
  keepLast(info.contextStack);
}

function keepLast(list) {
  var n = list.length;
  list.splice(0, n - 1);
}

export function get(key) {
  return key._reactInternalFiber;
}

export let __type = Object.prototype.toString;

export function isMounted(instance) {
  var fiber = get(instance);
  return !!(fiber && fiber.hasMounted);
}

let lowerCache = {};

export function toLowerCase(s) {
  return lowerCache[s] || (lowerCache[s] = s.toLowerCase());
}

let rword = /[^, ]+/g;

export function oneObject(array, val) {
  if (array + '' === array) {
    //利用字符串的特征进行优化，字符串加上一个空字符串等于自身
    array = array.match(rword) || [];
  }
  let result = {},
    //eslint-disable-next-line
    value = val !== void 666 ? val : 1;
  for (let i = 0, n = array.length; i < n; i++) {
    result[array[i]] = value;
  }
  return result;
}

let rcamelize = /[-_][^-_]/g;

export function camelize(target) {
  //提前判断，提高getStyle等的效率
  if (!target || (target.indexOf('-') < 0 && target.indexOf('_') < 0)) {
    return target;
  }
  //转换为驼峰风格
  let str = target.replace(rcamelize, function (match) {
    return match.charAt(1).toUpperCase();
  });
  return firstLetterLower(str);
}

export function firstLetterLower(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// undefined: 0, null: 1, boolean:2, number: 3, string: 4, function: 5, symbol:6, array: 7, object:8
