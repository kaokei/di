import { PostConstruct } from '@/index';
import { ERRORS } from '@/constants';

describe('DUPLICATE_POST_CONSTRUCT', () => {
  test('单个 @PostConstruct 不应抛出错误', async () => {
    class A {
      public name = 'A';
      public id = 1;

      @PostConstruct()
      public init() {
        this.id = 2;
      }
    }

    // Stage 3 装饰器：单个使用不应抛出错误
    expect(() => {
      new A();
    }).not.toThrowError();
  });

  test('重复使用 @PostConstruct 应在类定义时抛出错误', async () => {
    // Stage 3 装饰器：重复检测在装饰器应用阶段（类定义时）执行
    expect(() => {
      class A {
        public name = 'A';
        public id = 1;

        @PostConstruct()
        public init() {
          this.id = 2;
        }

        @PostConstruct()
        public init2() {
          this.id = 2;
        }
      }
      // 防止 A 被 tree-shaking 移除
      void A;
    }).toThrowError(ERRORS.POST_CONSTRUCT);
  });
});
