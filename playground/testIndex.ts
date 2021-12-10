import { Inject, Optional, Injector, Injectable } from '../src/index';

interface ABC {
  abc: string;
}

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

  @Inject(Logger)
  public logger!: Logger;

  @Optional()
  @Inject('NOT_FOUND_THEME')
  public theme = 'red';

  public constructor(public test: ABC) {}

  public say() {
    console.log(`${this.name} ${this.age}`);
  }
}

const injector = new Injector([
  {
    provide: User,
    useClass: User,
  },
  {
    provide: 'NOT_FOUND_THEME',
    useValue: 'blue',
  },
]);

const user1 = injector.get(User);

const user2 = injector.get(User);

console.log(user1 === user2);

user1.say();

user2.say();

user1.logger.log('hello');

user2.logger.log('world');

user1.logger.log(user1.theme);

user2.logger.log(user2.theme);
