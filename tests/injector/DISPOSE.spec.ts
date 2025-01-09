import { Inject, Injector, Injectable, forwardRef } from '@/index';
import exp from 'constants';

interface IA {
  name: string;
  id: number;
}

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  public timer!: any;

  public start() {
    this.timer = setTimeout(() => {
      console.log('A hasTimer');
    }, 10000);
  }

  public dispose() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;

  public timer!: any;

  public start() {
    this.timer = setTimeout(() => {
      console.log('B hasTimer');
    }, 10000);
  }

  public dispose() {
    clearTimeout(this.timer);
    this.timer = null;

    // throw error
    JSON.parse('{1234567890');
  }
}

describe('injector useValue', () => {
  let injector: Injector;

  beforeEach(() => {
    // injector = new Injector([]);
    injector = new Injector();
  });

  test('injector.get(A) should work correctly', async () => {
    const a = injector.get(A);
    const b = injector.get(B);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');

    expect(b).toBeInstanceOf(B);
    expect(b.id).toBe(2);
    expect(b.name).toBe('B');

    expect(a.timer).toBeUndefined();
    expect(b.timer).toBeUndefined();

    a.start();
    b.start();

    expect(a.timer).not.toBeUndefined();
    expect(b.timer).not.toBeUndefined();

    injector.dispose();

    expect(a.timer).toBe(null);
    expect(b.timer).toBe(null);

    expect(injector.providerMap).toBe(null);
    expect(injector.parent).toBe(null);
  });
});
