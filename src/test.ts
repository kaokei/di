import { Container } from './container';

class Test {}

const container = new Container();

container.bind(Test).toSelf();


const test1 = container.get(Test);
