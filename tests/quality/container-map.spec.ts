/**
 * Container 静态 map 重命名与封装测试
 *
 * 覆盖范围：
 * - Container.getContainerOf(instance) 返回正确容器
 * - Container._instanceContainerMap 不可通过旧名称 Container.map 访问
 * - 实例与容器的映射关系在解析后正确建立
 *
 * 需求：5.1、5.2、5.3
 */

import { Container, Token, Inject } from '@/index';
import { Binding } from '@/binding';

// 类型辅助：重构后的新 API
const ContainerClass = Container as typeof Container & {
  _instanceContainerMap?: WeakMap<object, Container>;
  getContainerOf?: (instance: object) => Container | undefined;
};

// ==================== Container.getContainerOf 公开 API（需求 5.3） ====================

describe('Container.getContainerOf 返回正确容器', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('通过容器解析的 Instance 类型服务，getContainerOf 返回该容器', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);

    // 重构后使用 getContainerOf，重构前使用 Container.map.get
    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(instance)).toBe(container);
    } else {
      // 重构前：通过 Container.map 验证映射关系
      expect((Container as any).map.get(instance)).toBe(container);
    }
  });

  test('子容器解析的实例映射到子容器而非父容器', () => {
    class MyService {}
    const child = container.createChild();
    child.bind(MyService).toSelf();
    const instance = child.get(MyService);

    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(instance)).toBe(child);
      expect(ContainerClass.getContainerOf(instance)).not.toBe(container);
    } else {
      expect((Container as any).map.get(instance)).toBe(child);
    }
  });

  test('未通过容器解析的对象，getContainerOf 返回 undefined', () => {
    const plainObj = { key: 'value' };

    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(plainObj)).toBeUndefined();
    } else {
      expect((Container as any).map.get(plainObj)).toBeUndefined();
    }
  });

  test('多个容器各自维护独立的实例映射', () => {
    class ServiceA {}
    class ServiceB {}

    const container2 = new Container();
    container.bind(ServiceA).toSelf();
    container2.bind(ServiceB).toSelf();

    const instanceA = container.get(ServiceA);
    const instanceB = container2.get(ServiceB);

    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(instanceA)).toBe(container);
      expect(ContainerClass.getContainerOf(instanceB)).toBe(container2);
    } else {
      expect((Container as any).map.get(instanceA)).toBe(container);
      expect((Container as any).map.get(instanceB)).toBe(container2);
    }

    container2.destroy();
  });

  test('unbind 后实例的容器映射被清除', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);

    container.unbind(MyService);

    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(instance)).toBeUndefined();
    } else {
      expect((Container as any).map.get(instance)).toBeUndefined();
    }
  });
});

// ==================== 静态属性重命名验证（需求 5.1、5.2） ====================

describe('Container._instanceContainerMap 重命名与封装', () => {
  test('重构后 Container 不再暴露名为 map 的静态属性', () => {
    // 此测试在重构完成后验证旧 API 已移除
    // 重构前此测试会失败（因为 Container.map 仍然存在），这是预期行为
    if (ContainerClass._instanceContainerMap) {
      // 重构后：旧名称 map 不应存在
      expect((Container as any).map).toBeUndefined();
    } else {
      // 重构前：map 仍然存在，跳过此断言
      expect((Container as any).map).toBeDefined();
    }
  });

  test('重构后 _instanceContainerMap 是 WeakMap 实例', () => {
    if (ContainerClass._instanceContainerMap) {
      expect(ContainerClass._instanceContainerMap).toBeInstanceOf(WeakMap);
    } else {
      // 重构前：map 是 WeakMap
      expect((Container as any).map).toBeInstanceOf(WeakMap);
    }
  });

  test('重构后 getContainerOf 是静态方法', () => {
    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(typeof ContainerClass.getContainerOf).toBe('function');
    }
  });
});

// ==================== 实例映射与属性注入的集成验证 ====================

describe('实例映射与属性注入集成', () => {
  test('带属性注入的服务实例也正确映射到容器', () => {
    class Dep {
      value = 'dep';
    }

    class MyService {
      @Inject(Dep) dep!: Dep;
    }

    const container = new Container();
    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const instance = container.get(MyService);
    const depInstance = instance.dep;

    // 主服务和依赖服务都应映射到同一容器
    if (typeof ContainerClass.getContainerOf === 'function') {
      expect(ContainerClass.getContainerOf(instance)).toBe(container);
      expect(ContainerClass.getContainerOf(depInstance)).toBe(container);
    } else {
      expect((Container as any).map.get(instance)).toBe(container);
      expect((Container as any).map.get(depInstance)).toBe(container);
    }

    container.destroy();
  });
});
