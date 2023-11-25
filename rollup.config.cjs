/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const pkg = require('./package.json');
const rollupJson = require('@rollup/plugin-json');
const rollupTerser = require('@rollup/plugin-terser');
const rollupBabel = require('@rollup/plugin-babel');
const rollupReplace = require('@rollup/plugin-replace');
const rollupCommonjs = require('@rollup/plugin-commonjs');
const rollupNodeResolve = require('@rollup/plugin-node-resolve');
const rollupTs = require('rollup-plugin-typescript2');
const rollupPolyfillNode = require('rollup-plugin-polyfill-node');

let hasTSChecked = false;
const name = 'index';
const formats = [
  'cjs',
  'cjs.min',
  'cjs.runtime',
  'cjs.runtime.min',
  'esm',
  'esm.min',
  'esm.runtime',
  'esm.runtime.min',
  'iife',
  'iife.min',
];

const banner = `
/**
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @link ${pkg.homepage}
 */
`.trimStart();

const packageConfigs = formats.map(format => createConfig(format));

module.exports = packageConfigs;

function createConfig(fileSuffix) {
  const format = fileSuffix.split('.')[0];
  const output = {
    banner,
    format,
    file: path.resolve(__dirname, `dist/${name}.${fileSuffix}.js`),
    exports: 'auto',
    sourcemap: true,
    externalLiveBindings: false,
    globals: {
      // 暂时没有用上globals
      postcss: 'postcss',
      jquery: '$',
      '@rollup/plugin-babel': 'helloWorldPluginBabel',
    },
  };

  const isRuntimeBuild = /runtime/.test(fileSuffix);
  const isProductionBuild = /\.min\.js$/.test(output.file);
  const isGlobalBuild = format === 'iife';
  const isESBuild = format === 'esm';
  const isCommonJSBuild = format === 'cjs';

  if (isGlobalBuild) {
    output.name = pkg.browserVariableName;
  }

  let entryFile = `src/index.ts`;

  // 这样写意味着不会打包任何npm包了
  let external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...['path', 'url', 'stream', 'fs', 'os'],
  ];

  const minifyPlugins = isProductionBuild
    ? [createMinifyPlugin(isESBuild)]
    : [];

  return {
    input: path.resolve(__dirname, entryFile),
    external,
    output,
    plugins: [
      createJsonPlugin(),
      createTypescriptPlugin(),
      createReplacePlugin(isProductionBuild),
      ...createNodePlugins(isCommonJSBuild),
      createBabelPlugin(isESBuild, isRuntimeBuild, isGlobalBuild),
      ...minifyPlugins,
    ],
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };
}

function createJsonPlugin() {
  return rollupJson({
    namedExports: false,
  });
}

function createTypescriptPlugin() {
  const hasTSChecked2 = hasTSChecked;
  hasTSChecked = true;
  const shouldEmitDeclarations = pkg.types && !hasTSChecked2;
  const tsPlugin = rollupTs({
    check: !hasTSChecked2,
    tsconfig: path.resolve(__dirname, 'tsconfig.app.json'),
    cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: true,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations,
      },
    },
  });
  return tsPlugin;
}

function createReplacePlugin(isProductionBuild) {
  const replacements = {
    __VERSION__: pkg.version,
    __DEV__: !isProductionBuild,
  };
  return rollupReplace({
    values: replacements,
    preventAssignment: true,
  });
}

function createNodePlugins(isCommonJSBuild) {
  return isCommonJSBuild
    ? [
        rollupCommonjs({
          sourceMap: false,
        }),
        rollupNodeResolve.nodeResolve(),
      ]
    : [
        rollupCommonjs({
          sourceMap: false,
        }),
        rollupPolyfillNode(),
        rollupNodeResolve.nodeResolve(),
      ];
}

function createBabelPlugin(isESBuild, isRuntimeBuild, isGlobalBuild) {
  const { getBabelOutputPlugin } = rollupBabel;
  return isRuntimeBuild
    ? getBabelOutputPlugin({
        allowAllFormats: isGlobalBuild,
        presets: [['@babel/preset-env', { modules: false }]],
        plugins: [
          ['@babel/plugin-transform-runtime', { useESModules: isESBuild }],
        ],
      })
    : getBabelOutputPlugin({
        allowAllFormats: isGlobalBuild,
        presets: [['@babel/preset-env', { modules: false }]],
      });
}

function createMinifyPlugin(isESBuild) {
  return rollupTerser({
    module: isESBuild,
    compress: {
      ecma: 2015,
      pure_getters: true,
    },
    safari10: true,
  });
}
