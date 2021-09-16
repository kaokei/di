import { Injectable } from '@/index';

import { UserClass } from './UserClass';

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
