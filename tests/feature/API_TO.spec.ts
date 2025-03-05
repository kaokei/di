import { Inject, Container, Token } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

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

  constructor(@Inject(UserClass) private userClass: UserClass) {}

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

describe('User depends on UserClass (no bindings)', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('container.get(User) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      container.get(User);
    }).toThrowError(BindingNotFoundError);
  });

  test('container.get(UserClass) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    expect(() => {
      container.get(UserClass);
    }).toThrowError(BindingNotFoundError);
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

  test('child.get(User) should throw ERROR_TOKEN_NOT_FOUND', async () => {
    // @notice
    // 本库寻找UserClass是从parent容器开始的，所以找不到UserClass导致异常
    expect(() => {
      child.get(User);
    }).toThrowError(BindingNotFoundError);
  });

  test('modify userClass.classNo', async () => {
    const userClass = child.get(UserClass);
    expect(userClass.getClassNo()).toBe(302);
    userClass.setClassNo(777);
    expect(userClass.getClassNo()).toBe(777);
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

describe('User depends on UserClass (use Token)', () => {
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

  test('Token should work', async () => {
    const user1 = container.get(User);
    const userClass1 = container.get(UserClass);
    const user2 = container.get(userKey);
    const userClass2 = container.get(userClassKey);

    expect(user1.getName()).toBe('zhangsan');
    expect(user1.getAge()).toBe(12);
    expect(userClass1.getClassNo()).toBe(302);
    expect(user2.getName()).toBe('zhangsan');
    expect(user2.getAge()).toBe(12);
    expect(userClass2.getClassNo()).toBe(302);

    expect(user1).not.toBe(user2);
    expect(userClass1).toBe(userClass2);
  });
});
