process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const parseArgs = require('minimist');

const cliArgs = parseArgs(process.argv.slice(2));

const bfj = require('bfj');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const globby = require('globby');
const webpack = require('webpack');
const filesize = require('filesize');
const { sync: gzipSize } = require('gzip-size');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const {
  createClientWebpackConfig,
  createServerWebpackConfig,
} = require('../../config/webpack.config');
const { inTeamCity: checkInTeamCity } = require('yoshi-helpers/queries');
const {
  ROOT_DIR,
  SRC_DIR,
  BUILD_DIR,
  TARGET_DIR,
  PUBLIC_DIR,
  STATICS_DIR,
  ASSETS_DIR,
  STATS_FILE,
} = require('yoshi-config/paths');
const {
  petriSpecsConfig,
  clientProjectName,
  clientFilesPath,
} = require('yoshi-config');
const wixDepCheck = require('../tasks/dep-check');

const inTeamCity = checkInTeamCity();

const copyTemplates = async () => {
  const files = await globby('**/*.{ejs,vm}', { cwd: SRC_DIR });

  await Promise.all(
    files.map(file => {
      return fs.copy(path.join(SRC_DIR, file), path.join(STATICS_DIR, file));
    }),
  );
};

module.exports = async () => {
  // Clean tmp folders
  await Promise.all([fs.emptyDir(BUILD_DIR), fs.emptyDir(TARGET_DIR)]);

  // Copy public to statics dir
  if (await fs.pathExists(PUBLIC_DIR)) {
    await fs.copy(PUBLIC_DIR, ASSETS_DIR);
  }

  await Promise.all([wixDepCheck(), copyTemplates()]);

  // Run CI related updates
  if (inTeamCity) {
    const petriSpecs = require('../tasks/petri-specs');
    const wixMavenStatics = require('../tasks/maven-statics');

    await Promise.all([
      petriSpecs({ config: petriSpecsConfig }),
      wixMavenStatics({
        clientProjectName,
        staticsDir: clientFilesPath,
      }),
    ]);
  }

  const clientDebugConfig = createClientWebpackConfig({
    isDebug: true,
    isAnalyze: false,
  });

  const clientOptimizedConfig = createClientWebpackConfig({
    isDebug: false,
    isAnalyze: cliArgs.analyze,
  });

  const clientOptimizedES6Config = cliArgs.modern && createClientWebpackConfig({
    isDebug: false,
    isAnalyze: cliArgs.analyze,
    isModernBuild: true,
  });

  const serverConfig = createServerWebpackConfig({
    isDebug: true,
  });

  let webpackStats;
  let messages;

  try {
    const compiler = webpack([
      clientDebugConfig,
      clientOptimizedConfig,
      ...(cliArgs.modern ? [clientOptimizedES6Config] : []),
      serverConfig,
    ]);

    webpackStats = await new Promise((resolve, reject) => {
      compiler.run((err, stats) => (err ? reject(err) : resolve(stats)));
    });

    if (cliArgs.modern) {
      const STATICS_DIR_MODERN = path.join(BUILD_DIR, 'statics-modern');
      const fileRe = RegExp('\.js', 'g');
      const dir = STATICS_DIR_MODERN;
      fs.readdirSync(dir)
        .filter(file => {
          console.log(file);
          return file.match(fileRe);
        })
        .forEach(file => {
          const filePath = path.join(dir, file);
          const newFilePath = path.join(STATICS_DIR, file.replace('.js', '.es6.js'));
          fs.renameSync(filePath, newFilePath)
        });
      fs.readdirSync(dir)
        .forEach(file => fs.unlinkSync(path.join(dir, file)));
      fs.rmdirSync(dir);
    }

    messages = formatWebpackMessages(webpackStats.toJson({}, true));

    if (messages.errors.length) {
      // Only keep the first error. Others are often indicative
      // of the same problem, but confuse the reader with noise.
      if (messages.errors.length > 1) {
        messages.errors.length = 1;
      }

      throw new Error(messages.errors.join('\n\n'));
    }
  } catch (error) {
    console.log(chalk.red('Failed to compile.\n'));
    console.error(error.message || error);

    process.exit(1);
  }

  if (messages.warnings.length) {
    console.log(chalk.yellow('Compiled with warnings.\n'));
    console.log(messages.warnings.join('\n\n'));
  } else {
    console.log(chalk.green('Compiled successfully.\n'));
  }

  const clientOptimizedStats = webpackStats.stats[1];

  // Calculate assets sizes
  const assets = clientOptimizedStats
    .toJson({ all: false, assets: true })
    .assets.filter(asset => !asset.name.endsWith('.map'))
    .map(asset => {
      const fileContents = fs.readFileSync(path.join(STATICS_DIR, asset.name));

      return {
        folder: path.join(
          path.relative(ROOT_DIR, STATICS_DIR),
          path.dirname(asset.name),
        ),
        name: path.basename(asset.name),
        gzipSize: gzipSize(fileContents),
        size: asset.size,
      };
    })
    .sort((a, b) => b.gzipSize - a.gzipSize);

  // Print build result nicely
  assets.forEach(asset => {
    console.log(
      '  ' +
        filesize(asset.size) +
        '  ' +
        `(${filesize(asset.gzipSize)} GZIP)` +
        '  ' +
        `${chalk.dim(asset.folder + path.sep)}${chalk.cyan(asset.name)}`,
    );
  });

  console.log();
  console.log(chalk.dim('    Interested in reducing your bundle size?'));
  console.log();
  console.log(
    chalk.dim('      > Try https://webpack.js.org/guides/code-splitting'),
  );
  console.log(
    chalk.dim(
      `      > If it's still large, analyze your bundle by running \`npx yoshi build --analyze\``,
    ),
  );

  if (cliArgs.stats) {
    await fs.ensureDir(path.dirname(STATS_FILE));
    await bfj.write(STATS_FILE, webpackStats.toJson());
  }

  return {
    persistent: !!cliArgs.analyze,
  };
};
