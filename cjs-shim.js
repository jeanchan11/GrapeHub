// CJS shim for import.meta.url
const { pathToFileURL } = require('url');
const _importMetaUrl = pathToFileURL(__filename).href;
