import 'reflect-metadata';
import { Injector, Injectable, InjectionKey } from '@/index';

@Injectable()
export class UserClass {
  private classNo = 302;

  public getClassNo() {
    return this.classNo;
  }

  public setClassNo(num: number) {
    this.classNo = num;
  }
}

@Injectable()
export class User {
  private name = 'zhangsan';
  private age = 12;

  constructor(private userClass: UserClass) {}

  public getName() {
    return this.name;
  }

  public setName(name: string) {
    this.name = name;
  }

  public getAge() {
    return this.age;
  }

  public setAge(age: number) {
    this.age = age;
  }

  public getUserClass() {
    return this.userClass;
  }
}

describe('User depends on UserClass (no providers)', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  test('instanceOf works right', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = injector.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (same Injector)', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([User, UserClass]);
  });

  test('instanceOf works right', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = injector.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (User inside parent Injector)', () => {
  let parent: Injector;
  let injector: Injector;

  beforeEach(() => {
    parent = new Injector([User]);
    injector = new Injector([UserClass], parent);
  });

  test('instanceOf works right', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);
    const parentUserClass = parent.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).not.toBe(user.getUserClass());
    expect(parentUserClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = injector.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);
    const parentUserClass = parent.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).not.toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(parentUserClass.getClassNo());
  });
});

describe('User depends on UserClass (UserClass inside parent Injector)', () => {
  let parent: Injector;
  let injector: Injector;

  beforeEach(() => {
    parent = new Injector([UserClass]);
    injector = new Injector([User], parent);
  });

  test('instanceOf works right', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = injector.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = injector.get(User);
    const userClass = injector.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (use InjectionKey)', () => {
  let injector: Injector;

  type UserKey = InjectionKey<User>;
  const userKey: UserKey = Symbol();

  type UserClassKey = InjectionKey<UserClass>;
  const userClassKey: UserClassKey = Symbol();

  beforeEach(() => {
    injector = new Injector([
      {
        provide: userKey,
        useClass: User,
      },
      {
        provide: userClassKey,
        useExisting: UserClass,
      },
    ]);
  });

  test('InjectionKey should work', async () => {
    const user1 = injector.get(User);
    const userClass1 = injector.get(UserClass);

    const user2 = injector.get(userKey);
    const userClass2 = injector.get(userClassKey);

    expect(user1).not.toBe(user2);
    expect(userClass1).toBe(userClass2);
  });
});
