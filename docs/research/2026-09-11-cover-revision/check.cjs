const fs = require('node:fs');
const Module = require('node:module');
const source = fs.readFileSync(require.resolve('../2026-09-11-cover/check.cjs'), 'utf8')
  .replace("before?'taptopick-cover.webp':'taptopick-cover-0911-01.webp'", "before?'taptopick-cover-0911-01.webp':'taptopick-cover-0911-01-v2.webp'");
const check = new Module(__filename, module);
check.filename = __filename;
check.paths = module.paths;
check._compile(source, __filename);
