const fs = require('node:fs');
const Module = require('node:module');
const source = fs.readFileSync(require.resolve('../2026-09-11-menu-logo/check.cjs'), 'utf8')
  .replace("before?'TAPtoPICK-logo-01.webp':'TAPtoTEST-logo-0911-01.webp'", "before?'TAPtoPICK-logo-0911-01.webp':'TAPtoPICK-logo-0911-01-v2.webp'");
const check = new Module(__filename, module);
check.filename = __filename;
check.paths = module.paths;
check._compile(source, __filename);
