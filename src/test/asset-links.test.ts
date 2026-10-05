import {describe,it,expect} from 'vitest';
import {assetDownload,safeUrl} from '../lib/assetLinks';
describe('ready asset links',()=>{
 it('preserves Drive resource keys and uses only exact Google host',()=>{expect(assetDownload({id:'1',label:'Video',kind:'video',url:'https://drive.google.com/file/d/abc_123/view?resourcekey=secret'})).toBe('https://drive.google.com/uc?export=download&id=abc_123&resourcekey=secret');expect(assetDownload({id:'1',label:'',kind:'video',url:'https://drive.google.com.evil.test/file/d/abc/view'})).toBe('');});
 it('does not invent download for folders or arbitrary pages',()=>{expect(assetDownload({id:'1',label:'Slides',kind:'folder',url:'https://drive.google.com/drive/folders/abc'})).toBe('');expect(assetDownload({id:'1',label:'',kind:'video',url:'https://example.org/watch'})).toBe('');});
 it('rejects active-content and credential URLs',()=>{expect(safeUrl('javascript:alert(1)')).toBe('');expect(safeUrl('https://user:pass@example.org')).toBe('');});
});
