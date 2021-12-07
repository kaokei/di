import { Injector, Injectable } from '../src/index';

@Injectable()
class Logger {
  public log(msg: string) {
    console.log(msg);
  }
}
@Injectable()
class User {
  public name = '章三';

  public age = 123;

  public say() {
    console.log(`${this.name} ${this.age}`);
  }
}

const injector = new Injector([
  {
    provide: User,
    useClass: User,
  },
]);

const user1 = injector.get(User);

const user2 = injector.get(User);

console.log(user1 === user2);

user1.say();

user2.say();
