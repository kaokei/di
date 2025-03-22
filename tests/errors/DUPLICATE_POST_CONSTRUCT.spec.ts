import { PostConstruct } from '@/index';
import { ERRORS } from '@/constants';

describe('DUPLICATE_POST_CONSTRUCT', () => {
  test('container.bind(A) should throw DuplicateBindingError', async () => {
    expect(() => {
      class A {
        public name = 'A';
        public id = 1;

        @PostConstruct()
        public init() {
          this.id = 2;
        }
      }
    }).not.toThrowError();
  });

  test('container.bind(A) should throw DuplicateBindingError', async () => {
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
    }).toThrowError(ERRORS.POST_CONSTRUCT);
  });
});
