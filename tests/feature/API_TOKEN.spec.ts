import { Container, Token } from '@/index';

interface IAnimal {
  id: number;
  name: string;

  eat(food: string): void;
}

interface IPlant {
  id: number;
  name: string;

  wave(): void;
}

class A implements IAnimal, IPlant {
  public name = 'A';
  public id = 1;

  public eat(food: string) {
    console.log('eat food => ', food);
  }

  public wave() {
    console.log('wav => ');
  }
}

const tokenAnimal = new Token<IAnimal>('animal');
const tokenPlant = new Token<IPlant>('plant');

describe('isBound', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(tokenAnimal).to(A);
    container.bind(tokenPlant).to(A);
  });

  test('container.get(A) should work correctly', async () => {
    const a = container.get(A);
    const aAnimal = container.get(tokenAnimal);
    const aPlant = container.get(tokenPlant);

    expect(a).toBeInstanceOf(A);
    expect(a.id).toBe(1);
    expect(a.name).toBe('A');
    expect(a.eat).toBeTypeOf('function');
    expect(a.wave).toBeTypeOf('function');

    expect(aAnimal).toBeInstanceOf(A);
    expect(aAnimal.id).toBe(1);
    expect(aAnimal.name).toBe('A');
    expect(aAnimal.eat).toBeTypeOf('function');

    expect(aPlant).toBeInstanceOf(A);
    expect(aPlant.id).toBe(1);
    expect(aPlant.name).toBe('A');
    expect(aPlant.wave).toBeTypeOf('function');

    expectTypeOf(aAnimal).toEqualTypeOf<IAnimal>();
    expectTypeOf(aPlant).toEqualTypeOf<IPlant>();
    expectTypeOf(a).toEqualTypeOf<A>();
  });
});
