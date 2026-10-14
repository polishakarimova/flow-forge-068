import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve('preview-dist');
let html=readFileSync(join(root,'index.html'),'utf8');
html=html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,path)=>'<script type="module">'+readFileSync(join(root,path),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/,(_,path)=>'<style>'+readFileSync(join(root,path),'utf8')+'</style>');
const target=process.argv[2];if(!target)throw Error('Specify the output HTML document');
writeFileSync(target,html);console.log('Standalone preview saved.');
