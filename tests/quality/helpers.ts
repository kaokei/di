/**
 * 代码质量优化测试的公共辅助工具
 */

import { Container } from '@/index';

/**
 * 创建一个干净的容器实例，用于测试隔离
 */
export function createContainer(): Container {
  return new Container();
}

/**
 * 创建父子容器结构
 */
export function createParentChildContainers(): {
  parent: Container;
  child: Container;
} {
  const parent = new Container();
  const child = parent.createChild();
  return { parent, child };
}
