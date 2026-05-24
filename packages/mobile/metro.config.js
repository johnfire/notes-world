const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// react-native is hoisted to the monorepo root alongside React 18.
// When it internally requires 'react' it picks up 18, but react-native 0.81.5
// expects React 19. resolveRequest intercepts every require across the entire
// bundle and forces 'react' to always come from the mobile-local React 19.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    try {
      return {
        type: "sourceFile",
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
      };
    } catch {
      return context.resolveRequest(context, moduleName, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
