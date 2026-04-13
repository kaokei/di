# 示例 05：Self 和 SkipSelf

本示例展示了在层级容器中精确控制依赖查找范围的两个装饰器。

## 展示的特性

- **@Self**：限制只在当前容器中查找依赖，不向上冒泡到父容器，找不到则抛出异常
- **@SkipSelf**：跳过当前容器，从父容器开始查找依赖
- **@Self + @Optional 组合**：当前容器找不到时返回 `undefined`，而非抛出异常
- **父子容器中的组合使用**：通过这两个装饰器实现精细的依赖作用域控制

## 核心概念

```typescript
@Injectable()
class MyService {
  @Inject(LOGGER)
  @Self()
  logger!: Logger; // 只在当前容器找，找不到抛异常

  @Inject(LOGGER)
  @SkipSelf()
  parentLogger!: Logger; // 跳过当前容器，从父容器找
}
```

## 适合人群

使用层级容器架构，需要精确控制某个依赖从哪个容器层级获取的开发者。
