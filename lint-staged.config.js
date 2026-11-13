module.exports = {
  'apps/mobile/src/**/*.{js,jsx,ts,tsx}':
    'npm --workspace=@vineme/mobile exec -- eslint --quiet --fix',
};
