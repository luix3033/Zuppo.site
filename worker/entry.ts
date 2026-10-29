import {createHandler} from './index.js';
import {defaultHome} from '../src/features/homepage/config';
// Cloudflare serve os arquivos do frontend via binding ASSETS; APIs ficam no Worker.
export default createHandler({},[],defaultHome);
