import { Inject, Container, LazyToken, Token } from '@/index';
import { CircularDependencyError, TokenNotFoundError } from '@/errors';

class UserClass {
  private classNo = 302;

  public getClassNo() {
    return this.classNo;
  }

  public setClassNo(num: number) {
    this.classNo = num;
  }
}

class User {
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
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(User).toSelf();
    container.bind(UserClass).toSelf();
  });

  test('instanceOf works right', async () => {
    const user = container.get(User);
    const userClass = container.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = container.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = container.get(User);
    const userClass = container.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (same container)', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(User).toSelf();
    container.bind(UserClass).toSelf();
  });

  test('instanceOf works right', async () => {
    const user = container.get(User);
    const userClass = container.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = container.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = container.get(User);
    const userClass = container.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (User inside parent container)', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(User).toSelf();
    child.bind(UserClass).toSelf();
  });

  test('instanceOf works right', async () => {
    const user = child.get(User);
    const userClass = child.get(UserClass);
    const parentUserClass = parent.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).not.toBe(user.getUserClass());
    expect(parentUserClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = child.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = child.get(User);
    const userClass = child.get(UserClass);
    const parentUserClass = parent.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).not.toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(parentUserClass.getClassNo());
  });
});

describe('User depends on UserClass (UserClass inside parent container)', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    child.bind(User).toSelf();
    parent.bind(UserClass).toSelf();
  });

  test('instanceOf works right', async () => {
    const user = child.get(User);
    const userClass = child.get(UserClass);

    expect(user).toBeInstanceOf(User);
    expect(userClass).toBeInstanceOf(UserClass);
    expect(userClass).toBe(user.getUserClass());
  });

  test('modify user name and age', async () => {
    const user = child.get(User);
    user.setName('lisi');
    user.setAge(123);

    expect(user.getName()).toBe('lisi');
    expect(user.getAge()).toBe(123);
  });

  test('modify userClass.classNo', async () => {
    const user = child.get(User);
    const userClass = child.get(UserClass);

    userClass.setClassNo(777);

    expect(userClass.getClassNo()).toBe(777);
    expect(user.getUserClass().getClassNo()).toBe(777);
  });
});

describe('User depends on UserClass (use InjectionKey)', () => {
  let container: Container;
  const userKey = new Token<User>('userKey');
  const userClassKey = new Token<UserClass>('userClassKey');

  beforeEach(() => {
    container = new Container();
    container.bind(User).toSelf();
    container.bind(UserClass).toSelf();
    container.bind(userKey).to(User);
    container.bind(userClassKey).toService(UserClass);
  });

  test('InjectionKey should work', async () => {
    const user1 = container.get(User);
    const userClass1 = container.get(UserClass);

    const user2 = container.get(userKey);
    const userClass2 = container.get(userClassKey);

    expect(user1).not.toBe(user2);
    expect(userClass1).toBe(userClass2);
  });
});
