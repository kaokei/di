import { PreDestroy } from '@/index';
import { ERRORS } from '@/constants';

describe('DUPLICATE_PRE_DESTROY', () => {
  test('单个 @PreDestroy 不应抛出错误', async () => {
    class A {
      public name = 'A';
      public id = 1;

      @PreDestroy()
      public init() {
        this.id = 2;
      }
    }

    // Stage 3 装饰器：单个使用不应抛出错误
    expect(() => {
      new A();
    }).not.toThrowError();
  });

  test('重复使用 @PreDestroy 应在类定义时抛出错误', async () => {
    // Stage 3 装饰器：重复检测在装饰器应用阶段（类定义时）执行
    expect(() => {
      class A {
        public name = 'A';
        public id = 1;

        @PreDestroy()
        public init() {
          this.id = 2;
        }

        @PreDestroy()
        public init2() {
          this.id = 2;
        }
      }
      // 防止 A 被 tree-shaking 移除
      void A;
    }).toThrowError(ERRORS.PRE_DESTROY);
  });
});
