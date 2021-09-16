import { Injectable } from '@/index';

@Injectable()
export class Person {
  private name = '';
  private age = 0;

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
}

@Injectable()
export class Student extends Person {
  private studentId = 0;

  public getStudentId() {
    return this.studentId;
  }

  public setStudentId(sid: number) {
    this.studentId = sid;
  }
}

@Injectable()
export class Teacher extends Person {
  private teacherId = 0;

  public getStudentId() {
    return this.teacherId;
  }

  public setStudentId(tid: number) {
    this.teacherId = tid;
  }
}
