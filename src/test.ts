import { Container } from './container';

class Test {
  public name = 123;
}

const container = new Container();

container.bind(Test).toSelf();

const test1 = container.get(Test);
