import { pathToFileURL } from 'node:url';
import { checkBuild } from './check-build.mjs';
process.env.NODE_ENV = 'production';
process.env.NITRO_HOST ||= '0.0.0.0';
process.env.NITRO_PORT ||= '3000';
await import(pathToFileURL(checkBuild().entry).href);
