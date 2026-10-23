// Production always uses the deployment's same-origin nginx routes.
const localRealPreview =
  process.env.NODE_ENV !== 'production' &&
  process.env.GROUP_CENTER_REAL_PREVIEW === '1';

const envConfig = {
  define: {
    'process.env.GROUP_CENTER_URL':
      process.env.NODE_ENV === 'production' || localRealPreview
        ? ''
        : process.env.GROUP_CENTER_URL,
    'process.env.GROUP_CENTER_REAL_PREVIEW': localRealPreview ? '1' : '0',
  },
};

export default envConfig;
