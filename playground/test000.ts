import 'reflect-metadata';
import {
  Skip,
  Self,
  Optional,
  Inject,
  Injector,
  Injectable,
  forwardRef,
} from '../src/index';

interface IA {
  name: string;
  id: number;
  b: IB;
}

interface IB {
  name: string;
  id: number;
}

@Injectable()
export class A {
  public name = 'A';
  public id = 1;

  @Inject(forwardRef(() => B))
  @Skip(false)
  @Self(false)
  @Optional(false)
  public b!: IB;
}

@Injectable()
export class B {
  public name = 'B';
  public id = 2;
}

export function run() {
  const injector = new Injector([]);
  const a = injector.get(A);
}
