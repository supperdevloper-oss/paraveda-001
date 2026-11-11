import { describe, expect, it } from 'vitest';
import { sniffBytes, validateContent, validateFile } from '../src/lib/utils/files';

describe('file inspection and limits',()=>{
 it('detects PDF from bytes and rejects an extension/content mismatch',async()=>{
  const pdf=new File(['%PDF-1.7\n'], 'photo.jpg',{type:'image/jpeg'});
  const result=await validateContent(pdf,{allowedExtensions:['.jpg'],allowedFamilies:['jpeg'],maxBytes:1024});
  expect(result).toMatchObject({ok:false,code:'unsupported-type'});
  expect(sniffBytes(new TextEncoder().encode('%PDF-1.7\n')).family).toBe('pdf');
 });
 it('rejects files over a tool-specific size limit',()=>{
  const file=new File([new Uint8Array(16)],'small.jpg');
  expect(validateFile(file,{allowedExtensions:['.jpg'],maxBytes:8})).toMatchObject({ok:false,code:'too-large'});
 });
 it('rejects empty and unknown-content files',async()=>{
  const empty=new File([], 'empty.png');
  expect(validateFile(empty,{allowedExtensions:['.png'],maxBytes:1024})).toMatchObject({ok:false,code:'empty'});
  const unknown=new File(['not an image'],'image.png');
  expect(await validateContent(unknown,{allowedExtensions:['.png'],allowedFamilies:['png'],maxBytes:1024})).toMatchObject({ok:false,code:'corrupt'});
 });
});
