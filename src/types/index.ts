// 必须有import/export，才会被识别为module，而不是script
// 只有识别为module，作用域才是当前文件，而不是全局的
// 如果是script，那么就是全局可见

export type SafeAny = any;
