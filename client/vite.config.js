import {defineConfig} from 'vite';
export default defineConfig({
  appType:'spa',
  server:{host:'127.0.0.1',proxy:{'/api':'http://127.0.0.1:4000','/uploads':'http://127.0.0.1:4000'}},
});
