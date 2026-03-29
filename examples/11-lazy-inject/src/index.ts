/**
 * 示例 11：LazyInject
 *
 * 展示内容：
 * 1. @LazyInject 替代 @Inject（自动识别容器）
 * 2. @LazyInject(token, container) 显式指定容器
 * 3. createLazyInject(container) 创建绑定容器的 LazyInject
 *
 * 【@LazyInject 与 @Inject 的区别】
 * @Inject：在容器实例化服务时立即注入（eager）
 * @LazyInject：在首次访问属性时才从容器解析（lazy）
 *
 * 【@LazyInject 自动查找容器的原理】
 * 通过 Container.getContainerOf(instance) 查找实例所属容器。
 * 该映射仅对 Instance 类型（to() / toSelf()）的绑定有效。
 * toConstantValue / toDynamicValue 场景必须显式传入 container 参数。
 */

import { Container, Token, LazyInject, createLazyInject, Inject } from '@kaokei/di';

// ==================== 定义服务 ====================

class LoggerService {
  prefix = '[Logger]';
  log(msg: string) {
    console.log(`${this.prefix} ${msg}`);
  }
}

class ConfigService {
  appName = 'MyApp';
  version = '1.0.0';
}

// ==================== 场景一：@LazyInject 自动识别容器 ====================

console.log('=== 场景一：@LazyInject 自动识别容器 ===');

class AppService {
  // @LazyInject 不需要指定容器，首次访问时自动通过 Container.getContainerOf(this) 查找
  @LazyInject(LoggerService)
  logger!: LoggerService;

  @LazyInject(ConfigService)
  config!: ConfigService;

  run() {
    // 首次访问 this.logger 时才触发容器解析
    this.logger.log(`应用启动：${this.config.appName} v${this.config.version}`);
  }
}

const container = new Container();
container.bind(LoggerService).toSelf();
container.bind(ConfigService).toSelf();
container.bind(AppService).toSelf();

const app = container.get(AppService);
app.run();

// ==================== 场景二：@LazyInject 显式指定容器 ====================

console.log('\n=== 场景二：@LazyInject 显式指定容器（适用于 React 类组件等场景）===');

// 在某些场景下（如 React 类组件），实例不是通过容器创建的，
// 无法通过 Container.getContainerOf 自动查找容器，需要显式传入
const globalContainer = new Container();
globalContainer.bind(LoggerService).toSelf();
globalContainer.bind(ConfigService).toSelf();

class ReactLikeComponent {
  // 显式指定容器，适用于实例不由容器管理的场景
  @LazyInject(LoggerService, globalContainer)
  logger!: LoggerService;

  @LazyInject(ConfigService, globalContainer)
  config!: ConfigService;

  render() {
    this.logger.log(`渲染组件：${this.config.appName}`);
  }
}

// 这个实例不是通过容器创建的（模拟 React 组件实例化）
const component = new ReactLikeComponent();
component.render(); // 仍然能正确注入，因为显式指定了容器

// ==================== 场景三：createLazyInject 创建绑定容器的装饰器工厂 ====================

console.log('\n=== 场景三：createLazyInject 创建绑定容器的装饰器工厂 ===');

// 在模块级别创建绑定到特定容器的 LazyInject 工厂
// 适合在整个模块中统一使用同一个容器
const moduleContainer = new Container();
moduleContainer.bind(LoggerService).toSelf();
moduleContainer.bind(ConfigService).toSelf();

// 创建绑定到 moduleContainer 的 LazyInject 工厂
const ModuleLazyInject = createLazyInject(moduleContainer);

class ModuleService {
  // 使用模块级别的 LazyInject，无需每次都传入容器
  @ModuleLazyInject(LoggerService)
  logger!: LoggerService;

  @ModuleLazyInject(ConfigService)
  config!: ConfigService;

  execute() {
    this.logger.log(`模块服务执行：${this.config.appName}`);
  }
}

// ModuleService 实例不需要通过容器创建
const moduleService = new ModuleService();
moduleService.execute();

// ==================== 场景四：Token 类型的 LazyInject ====================

console.log('\n=== 场景四：Token 类型的 LazyInject ===');

const APP_TITLE = new Token<string>('APP_TITLE');

const tokenContainer = new Container();
tokenContainer.bind(APP_TITLE).toConstantValue('我的应用');

class TitleComponent {
  // Token 类型必须显式传入容器（toConstantValue 不会注册到 _instanceContainerMap）
  @LazyInject(APP_TITLE, tokenContainer)
  title!: string;

  show() {
    console.log('应用标题：', this.title);
  }
}

const titleComp = new TitleComponent();
titleComp.show(); // 应用标题：我的应用
