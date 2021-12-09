export class InjectFailedError extends Error {
  public name = 'INJECT_FAILED_ERROR';
  public message = this.name;

  constructor(
    injectMeta: any,
    ClassName: any,
    key: string | number,
    paramType?: any
  ) {
    super();

    if (paramType) {
      // 是构造函数的参数装饰器
      if (injectMeta && injectMeta.value === Object) {
        this.message = `CAN NOT USE OBJECT AS INJECTION TOKEN. PARAMETER ${key} OF CLASS ${ClassName}.`;
      } else if (paramType === Object) {
        this.message = `CONSTRUCTOR PARAMETER TYPE IS OBJECT OR INTERFACE, MUST USE @INJECT TO SPECIFY INJECTION TOKEN. PARAMETER ${key} OF CLASS ${ClassName}.`;
      }
    } else {
      // 是属性装饰器
      if (!injectMeta) {
        this.message = `INJECT PROPERTY REQUIRE @INJECT() DECORATOR. PROPERTY ${key} OF CLASS ${ClassName}.`;
      } else if (injectMeta.value === Object) {
        this.message = `CAN NOT USE OBJECT AS INJECTION TOKEN. PROPERTY ${key} OF CLASS ${ClassName}.`;
      }
    }
  }
}
