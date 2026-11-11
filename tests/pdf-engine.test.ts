import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs, splitPdf, rotatePdf, deletePdfPages, imagesToPdf, readPdf } from '../src/lib/engines/pdf';

async function fixture(name:string,pages:number){const doc=await PDFDocument.create();for(let i=0;i<pages;i++)doc.addPage([300+i*10,400]);return{name,data:new Uint8Array(await doc.save())};}
async function pageCount(data:Uint8Array){return(await PDFDocument.load(data)).getPageCount();}

describe('PDF engine with real PDF bytes',()=>{
  it('merges, splits and reopens outputs',async()=>{
    const a=await fixture('alpha.pdf',2),b=await fixture('beta.pdf',1);
    const merged=await mergePdfs([a,b]);
    expect(await pageCount(merged.data)).toBe(3);
    const split=await splitPdf({name:merged.name,data:merged.data},{mode:'every',everyN:2});
    expect(split).toHaveLength(2);
    expect(await pageCount(split[0]!.data)).toBe(2);
    expect(await pageCount(split[1]!.data)).toBe(1);
  });
  it('rotates and deletes selected pages while preserving a valid PDF',async()=>{
    const source=await fixture('three.pdf',3);
    const rotated=await rotatePdf(source,{angle:90,scope:'range',pages:'2',relative:'add'});
    const rotatedDoc=await PDFDocument.load(rotated.data);
    expect(rotatedDoc.getPageCount()).toBe(3);
    expect(rotatedDoc.getPage(1).getRotation().angle).toBe(90);
    const deleted=await deletePdfPages(source,{mode:'delete',pages:'2'});
    expect(await pageCount(deleted.data)).toBe(2);
  });
  it('embeds a valid PNG into a readable PDF',async()=>{
    const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/o1sAAAAASUVORK5CYII=','base64'));
    const outputs=await imagesToPdf([{name:'tiny.png',data:png,ext:'png',width:1,height:1}],{combine:'single',pageSize:'fit',orientation:'auto',marginMm:0});
    expect(outputs).toHaveLength(1);
    expect(await pageCount(outputs[0]!.data)).toBe(1);
  });
  it('rejects corrupt PDF bytes with a useful error',async()=>{
    await expect(readPdf(new Uint8Array([1,2,3,4]))).rejects.toThrow(/could not be read as a PDF/i);
  });
});
