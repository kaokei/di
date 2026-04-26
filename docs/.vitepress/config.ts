import path from 'path';
import { defineConfig } from 'vitepress';

const REPO_ROOT = path.resolve(__dirname, '../..');
const GITHUB_BASE =
  'https://github.com/kaokei/di/blob/main';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  markdown: {
    config(md) {
      // 将 docs/ 之外的相对路径链接转换为 GitHub URL
      const defaultRender =
        md.renderer.rules.link_open ||
        function (tokens, idx, options, _env, self) {
          return self.renderToken(tokens, idx, options);
        };

      md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const hrefIndex = token.attrIndex('href');
        if (hrefIndex >= 0) {
          const href = token.attrs![hrefIndex][1];
          // 只处理相对路径，且解析后落在 docs/ 目录之外
          // filePath 是绝对路径（VitePress 构建时注入）
          const filePath: string | undefined = env.filePath ?? env.realPath;
          if (href && !href.startsWith('http') && !href.startsWith('#') && filePath) {
            const mdDir = path.dirname(filePath);
            const resolved = path.resolve(mdDir, href);
            const docsDir = path.resolve(REPO_ROOT, 'docs');
            if (!resolved.startsWith(docsDir + path.sep) && !resolved.startsWith(docsDir + '/')) {
              const repoRelative = path.relative(REPO_ROOT, resolved);
              token.attrs![hrefIndex][1] = `${GITHUB_BASE}/${repoRelative}`;
            }
          }
        }
        return defaultRender(tokens, idx, options, env, self);
      };
    },
  },
  title: '@kaokei/di',
  description: 'Tiny di library depends on typescript decorator.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Example', link: '/examples/' },
      { text: 'Note', link: '/note/01.什么是Token' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          link: '/guide/',
          items: [
            { text: '对比 inversify 的实现差异', link: '/guide/COMPARE' },
            {
              text: '本库 API 和 inversify API 的对比',
              link: '/guide/COMPARE-API',
            },

          ],
        },
      ],
      '/api/': [
        {
          text: 'API 文档',
          link: '/api/',
          items: [
            { text: 'Container 文档', link: '/api/CONTAINER' },
            { text: 'Binding 文档', link: '/api/BINDING' },
            { text: 'decorate 文档', link: '/api/DECORATE' },
            { text: 'LazyInject 文档', link: '/api/LAZY_INJECT' },
            { text: '元数据管理文档', link: '/api/CACHEMAP' },
            { text: '错误类文档', link: '/api/ERRORS' },
            { text: '类型导出文档', link: '/api/TYPES' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'CodeSandbox 在线示例',
          link: '/examples/',
        },
      ],
      '/note/': [
        {
          text: 'Note',
          items: [
            { text: '什么是Token', link: '/note/01.什么是Token' },
            { text: '什么是服务', link: '/note/02.什么是服务' },
            { text: '什么是容器', link: '/note/03.什么是容器' },
            { text: '什么是依赖注入', link: '/note/04.什么是依赖注入' },
            { text: '什么是循环依赖', link: '/note/05.什么是循环依赖' },
            { text: '异步初始化服务', link: '/note/06.异步初始化服务' },
            { text: 'AUTOBIND', link: '/note/07.AUTOBIND' },
            { text: '灵感来源', link: '/note/08.灵感来源' },
            { text: '支持javascript', link: '/note/09.支持javascript' },
            { text: 'Angular', link: '/note/10.Angular' },
            { text: 'Vue', link: '/note/11.Vue' },
            { text: '打包大小对比', link: '/note/12.打包大小对比' },
            { text: '生命周期', link: '/note/13.生命周期' },
            {
              text: 'useDefineForClassFields',
              link: '/note/14.useDefineForClassFields',
            },
            {
              text: 'inversify使用条件',
              link: '/note/15.inversify使用条件',
            },
            {
              text: '未来改进方向',
              link: '/note/16.未来改进方向',
            },
            {
              text: 'TokenType的使用场景',
              link: '/note/17.TokenType的使用场景',
            },
            {
              text: 'toDynamicValue异步支持分析',
              link: '/note/18.toDynamicValue异步支持分析',
            },
            {
              text: 'TC39-Stage3-装饰器类型详解',
              link: '/note/19.TC39-Stage3-装饰器类型详解',
            },
            {
              text: 'Legacy-experimentalDecorators-装饰器类型详解',
              link: '/note/20.Legacy-experimentalDecorators-装饰器类型详解',
            },
            {
              text: 'PostConstruct执行时属性注入完整性分析',
              link: '/note/21.PostConstruct执行时属性注入完整性分析',
            },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/kaokei/di' }],
  },
});
