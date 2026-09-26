module.exports = function (api) {
  // Jest doesn't render styles, so tests skip NativeWind's JSX runtime (className → no-op).
  // `api.env` also keys Babel's cache by environment.
  if (api.env('test')) return { presets: ['babel-preset-expo'] };
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
