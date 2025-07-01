import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '@kaokei/di',
  description: 'Tiny di library depends on typescript decorator.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
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
            { text: 'Binding 文档', link: '/api/BINDING' },
            { text: 'Container 文档', link: '/api/CONTAINER' },
            { text: 'decorate 文档', link: '/api/DECORATE' },
            { text: 'LazyInject 文档', link: '/api/LAZY_INJECT' },
          ],
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
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/kaokei/di' }],
  },
});
