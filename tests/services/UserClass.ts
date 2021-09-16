import { Injectable } from '@/index';

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
