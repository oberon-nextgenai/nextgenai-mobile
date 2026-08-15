const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
const defaultBlockList = config.resolver.blockList;
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Jest specs are co-located, including inside app/ — without this Metro
  // hands them to expo-router as routes and the bundle drags in
  // @testing-library/react-native (which throws outside a test runner).
  blockList: [
    ...(Array.isArray(defaultBlockList)
      ? defaultBlockList
      : defaultBlockList
        ? [defaultBlockList]
        : []),
    /\.spec\.(js|jsx|ts|tsx)$/,
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
