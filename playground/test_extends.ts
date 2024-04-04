import 'reflect-metadata';
import { Inject, Injector, Injectable, forwardRef } from '../src/index';

interface IA {
  name: string;
  id: number;
  b: IB;
  c: IC;
}
interface IB {
  name: string;
  id: number;
  bName: string;
  bId: number;
  c: IC;
}
interface IC {
  name: string;
  id: number;
  cName: string;
  cId: number;
  b: IB;
}
@Injectable()
export class C {
  public name = 'C';
  public id = 3;
  public cName = 'C';
  public cId = 3;

  @Inject(forwardRef(() => B))
  public b!: IB;
}
@Injectable()
export class B {
  public name = 'B';
  public id = 2;
  public bName = 'B';
  public bId = 2;

  @Inject(forwardRef(() => C))
  public c!: IC;
}
@Injectable()
export class A extends B {
  public name = 'A';
  public id = 1;
}

export function run() {
  const injector = new Injector([]);
  const a = injector.get(A);
}
