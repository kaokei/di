import { run as runTest000 } from './test000';
import { run as runTest011 } from './test011';
import { run as runTestExtends } from './test_extends';

const isInDebugMode = () => {
  // return eval('__DEV__');
  (globalThis as any)['__DEV__'] = true;
};

isInDebugMode();

// runTest000();
// runTest011();
runTestExtends();

console.log(123123);
console.log(456456);
console.log(798798);
