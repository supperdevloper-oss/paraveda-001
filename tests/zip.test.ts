import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { createZip } from '../src/lib/engines/zip';

describe('browser ZIP result packaging',()=>{
 it('places multiple outputs in a valid archive and resolves duplicate names',async()=>{
  const zip=await createZip([
   {name:'photo.jpg',blob:new Blob(['one'])},
   {name:'photo.jpg',blob:new Blob(['two'])},
  ]);
  const files=unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(files).sort()).toEqual(['README.txt','photo-2.jpg','photo.jpg']);
  expect(strFromU8(files['photo.jpg']!)).toBe('one');
  expect(strFromU8(files['photo-2.jpg']!)).toBe('two');
  expect(strFromU8(files['README.txt']!)).toContain('processed in your browser');
 });
 it('sanitizes unsafe archive paths',async()=>{
  const zip=await createZip([{name:'../../secret.txt',blob:new Blob(['safe'])}]);
  const files=unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(files)).not.toContain('../../secret.txt');
  expect(Object.keys(files).some(name=>name.includes('secret.txt'))).toBe(true);
 });
});
