'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import Image from 'next/image';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Download, FilePlus2, FileText, LoaderCircle, Play, RotateCcw, Trash2, Upload, X, Archive } from 'lucide-react';
import type { OutputFile, ToolDefinition, ToolSetting, ProgressInfo } from '@/lib/tools/types';
import { validateContent, validateFile } from '@/lib/utils/files';
import { formatBytes, savingsPercent, uid } from '@/lib/utils/format';
import { createZip, downloadBlob, zipNameForTool } from '@/lib/engines/zip';
import { consumeHandoff } from '@/lib/queued-transfer';

const FAMILY_BY_EXT: Record<string, string> = { '.jpg':'jpeg','.jpeg':'jpeg','.png':'png','.webp':'webp','.gif':'gif','.bmp':'bmp','.avif':'avif','.pdf':'pdf','.mp4':'mp4','.mov':'mov','.wav':'wav','.mp3':'mp3','.m4a':'m4a','.ogg':'ogg','.webm':'webm','.mkv':'mkv' };
type QFile = { id:string; file:File; status:'ready'|'processing'|'done'|'failed'|'cancelled'; error?:string; preview?:string; meta?:{width?:number;height?:number;pages?:number} };

function initialSettings(tool: ToolDefinition): Record<string, string | number | boolean> {
  return Object.fromEntries(tool.settings.map(s => [s.key, s.default]));
}

export function ToolRunner({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<QFile[]>([]);
  const [settings, setSettings] = useState(() => initialSettings(tool));
  const [outputs, setOutputs] = useState<OutputFile[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const [capabilities, setCapabilities] = useState<{encodeWebp:boolean;encodeAvif:boolean}|null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const cancelRef = useRef({ cancelled: false });
  const urls = useRef<string[]>([]);
  const handoffLoaded = useRef(false);
  const completed = outputs.length > 0;
  const accept = tool.accept.join(',');
  const selectedFormat=String(settings.outputFormat??tool.defaultOutput??tool.outputFormats[0]??'');
  const autoKeepsWebp=selectedFormat==='auto'&&tool.engine==='canvas'&&files.some(f=>f.file.name.toLowerCase().endsWith('.webp'));
  const unsupportedOutput=Boolean(capabilities&&((selectedFormat==='webp'||autoKeepsWebp)&&!capabilities.encodeWebp||(selectedFormat==='avif'&&!capabilities.encodeAvif)));

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); }, []);
  useEffect(() => { void import('@/lib/engines/capabilities').then(m=>m.detectCapabilities()).then(c=>setCapabilities({encodeWebp:c.encodeWebp,encodeAvif:c.encodeAvif})); }, []);
  const releaseOutputs = useCallback(() => {
    // Output blobs are retained in component state only; preview object URLs
    // belong to queued inputs and must survive adding/removing other files.
    setOutputs([]);
  }, []);
  const addFiles = useCallback(async (incoming: File[]) => {
    setNotice('');
    const remaining = tool.maxFiles - files.length;
    const accepted = incoming.slice(0, Math.max(0, remaining));
    if (incoming.length > remaining) setNotice(`This tool accepts up to ${tool.maxFiles} file(s) per run.`);
    const next: QFile[] = [];
    for (const file of accepted) {
      const basic = validateFile(file, { allowedExtensions: tool.inputFormats, maxBytes: tool.maxInputBytes, maxFiles: tool.maxFiles });
      if (!basic.ok) { next.push({ id: uid('file'), file, status: 'failed', error: basic.error }); continue; }
      const family = FAMILY_BY_EXT[file.name.toLowerCase().slice(file.name.lastIndexOf('.'))];
      const verified = await validateContent(file, { allowedExtensions: tool.inputFormats, allowedFamilies: family ? [family as never] : undefined, maxBytes: tool.maxInputBytes });
      if (!verified.ok) { next.push({ id: uid('file'), file, status: 'failed', error: verified.error }); continue; }
      let preview: string | undefined;
      let meta: QFile['meta'];
      try {
        if (['jpeg','png','webp','gif','bmp','avif'].includes(family ?? '')) {
          const {readImageSize}=await import('@/lib/engines/image');
          const size=await readImageSize(file);
          meta={width:size.w,height:size.h};
          preview=URL.createObjectURL(file);urls.current.push(preview);
        } else if (family==='pdf') {
          const {getPdfPageCount}=await import('@/lib/engines/pdf');
          meta={pages:await getPdfPageCount(file)};
        }
      } catch (err) {
        next.push({id:uid('file'),file,status:'failed',error:(err as Error).message||'This file could not be decoded.'});
        continue;
      }
      next.push({ id: uid('file'), file, status: 'ready', preview, meta });
    }
    setFiles(prev => [...prev, ...next]);
    releaseOutputs();
  }, [files.length, tool, releaseOutputs]);
  useEffect(() => { if(handoffLoaded.current)return;handoffLoaded.current=true;void consumeHandoff(tool.slug).then(pending=>{if(pending.length)void addFiles(pending)}).catch(()=>undefined); }, [tool.slug, addFiles]);
  const onPicker = (e: ChangeEvent<HTMLInputElement>) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); void addFiles(Array.from(e.dataTransfer.files)); };
  const removeFile = (id:string) => { setFiles(prev => { const f=prev.find(x=>x.id===id); if(f?.preview){URL.revokeObjectURL(f.preview);urls.current=urls.current.filter(u=>u!==f.preview)} return prev.filter(x=>x.id!==id); }); releaseOutputs(); };
  const moveFile = (id:string,delta:number) => setFiles(prev=>{const from=prev.findIndex(f=>f.id===id);const to=from+delta;if(from<0||to<0||to>=prev.length)return prev;const next=[...prev];[next[from],next[to]]=[next[to]!,next[from]!];return next;});
  const set = (key:string, value:string|number|boolean) => setSettings(prev=>({...prev,[key]:value}));

  const process = async () => {
    if (!files.some(f=>f.status==='ready') || busy) return;
    cancelRef.current = { cancelled:false };
    setBusy(true); setNotice(''); releaseOutputs();
    const signal = cancelRef.current;
    const result: OutputFile[] = [];
    const progressCb = (label:string, ratio:number|null, done=0,total=1) => setProgress({ done,total,ratio,label });
    const candidates = files.filter(f=>f.status==='ready');
    setFiles(prev=>prev.map(f=>f.status==='ready'?{...f,status:'processing'}:f));
    try {
      if (tool.slug === 'merge-pdf') {
        if (candidates.length < 2) throw new Error('Add at least two PDF files to merge.');
        progressCb('Merging PDF files…', null);
        const { mergePdfs } = await import('@/lib/engines/pdf');
        const ins = await Promise.all(candidates.map(async f=>({name:f.file.name,data:new Uint8Array(await f.file.arrayBuffer())})));
        const out = await mergePdfs(ins, {order:String(settings.order) as 'list'|'name'|'size', sizes:Object.fromEntries(candidates.map(f=>[f.file.name,f.file.size])), pageRanges:String(settings.pageRanges||''),hooks:{signal,onProgress:(p)=>progressCb(p.label??'Merging…',p.ratio??null)}});
        result.push(makeOutput(out.name,new Blob([Uint8Array.from(out.data).buffer],{type:'application/pdf'}), candidates[0]!));
        setFiles(prev=>prev.map(f=>f.status==='processing'?{...f,status:'done'}:f));
      } else if (tool.slug === 'jpg-to-pdf' || tool.slug === 'png-to-pdf') {
        progressCb('Preparing images for PDF…', null);
        const { imagesToPdf } = await import('@/lib/engines/pdf');
        const { readImageSize, convertImage } = await import('@/lib/engines/image');
        const items=[];
        for (const f of candidates) {
          if(signal.cancelled) throw Object.assign(new Error('Cancelled.'),{code:'cancelled'});
          const size=await readImageSize(f.file);
          const ext=f.file.name.split('.').pop()?.toLowerCase()||'jpg';
          let data=new Uint8Array(await f.file.arrayBuffer()), outExt=ext;
          if ((tool.slug==='png-to-pdf' && settings.transparency==='flatten') || (tool.slug==='jpg-to-pdf' && settings.imageQuality==='reencode')) {
            const maxDimension=Number(settings.maxDimension??0);
            const encoded=await convertImage(f.file,f.file.name,{outputExt:'jpg',quality:Number(settings.quality??85),background:'#ffffff',resize:maxDimension>0?{mode:'keep',maxDimension}:{mode:'keep'}});
            data=new Uint8Array(await encoded.blob.arrayBuffer());outExt='jpg';
          }
          items.push({name:f.file.name,data,ext:outExt,width:size.w,height:size.h});
        }
        const outs=await imagesToPdf(items,{combine:String(settings.combine??'single') as 'single'|'separate',pageSize:String(settings.pageSize??'fit') as 'fit'|'a3'|'a4'|'a5'|'letter'|'legal',orientation:String(settings.orientation??'auto') as 'auto'|'portrait'|'landscape',marginMm:Number(settings.margin??0),hooks:{signal,onProgress:(p)=>progressCb(p.label??'Preparing PDF…',p.ratio??null)}});
        outs.forEach((out,i)=>result.push(makeOutput(out.name,new Blob([Uint8Array.from(out.data).buffer],{type:'application/pdf'}),candidates[Math.min(i,candidates.length-1)]!)));
        setFiles(prev=>prev.map(f=>f.status==='processing'?{...f,status:'done'}:f));
      } else {
        for (let i=0;i<candidates.length;i++) {
          if(signal.cancelled) break;
          const queued=candidates[i]!;
          const hook = (p:{label?:string;ratio?:number|null})=>progressCb(`${queued.file.name} — ${p.label ?? 'Processing…'}`,p.ratio ?? null,i,candidates.length);
          try {
            const made = await runOne(tool, queued.file, settings, {signal,onProgress:hook});
            for(const item of made) result.push(makeOutput(item.name,item.blob,queued,item.meta));
            setFiles(prev=>prev.map(f=>f.id===queued.id?{...f,status:'done'}:f));
          } catch(err) {
            const e=err as Error & {code?:string};
            if(e.code==='cancelled' || signal.cancelled){setFiles(prev=>prev.map(f=>f.id===queued.id?{...f,status:'cancelled'}:f));}
            else {setFiles(prev=>prev.map(f=>f.id===queued.id?{...f,status:'failed',error:e.message||'This file could not be processed.'}:f));}
          }
        }
      }
      if (signal.cancelled) setNotice('Processing cancelled. Completed files are still available below.');
      setOutputs(result);
      if (!result.length && !signal.cancelled) setNotice('No file was converted. Check the errors beside your files and try again.');
      setProgress({done:candidates.length,total:candidates.length,ratio:1,label:'Finished'});
    } catch(err) {
      const e=err as Error;
      setNotice(e.message || 'The operation failed. Check the file and settings, then try again.');
      setFiles(prev=>prev.map(f=>f.status==='processing'?{...f,status:signal.cancelled?'cancelled':'failed',error:e.message}:f));
    } finally { setBusy(false); }
  };

  const cancel = async () => { cancelRef.current.cancelled=true; setNotice('Cancelling…'); if(tool.engine==='ffmpeg'){const m=await import('@/lib/engines/media'); await m.disposeMediaEngine();} else if(tool.engine==='canvas'){const m=await import('@/lib/engines/image');m.cancelImageWorkerTasks();} };
  const downloadAll = async () => { if(!outputs.length)return; if(outputs.length===1){downloadBlob(outputs[0]!.blob,outputs[0]!.name);return;} try {const zip=await createZip(outputs.map(o=>({name:o.name,blob:o.blob,sourceName:o.sourceName})));downloadBlob(zip,zipNameForTool(tool.name));}catch(e){setNotice((e as Error).message)} };
  const reset = () => { if(busy) void cancel(); files.forEach(f=>f.preview&&URL.revokeObjectURL(f.preview));urls.current=[];setFiles([]);releaseOutputs();setProgress(null);setNotice('');setSettings(initialSettings(tool)); };

  return <section className="cf-tool-workbench" aria-label={`${tool.name} file tool`}>
    <div className="cf-upload-zone" onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} data-dragging={dragging}>
      <input ref={picker} className="cf-sr-only" type="file" multiple={tool.maxFiles>1} accept={accept} onChange={onPicker} aria-label={`Choose files for ${tool.name}`} />
      <div className="cf-upload-icon"><Upload size={25}/></div><h2>{files.length?'Add more files':'Drop files here'}</h2><p>or choose files from this device · max {formatBytes(tool.maxInputBytes)} per file</p>
      <button className="cf-btn cf-btn-primary cf-btn-lg" onClick={()=>picker.current?.click()}><FilePlus2 size={18}/>Choose Files</button>
      <small>Accepted: {tool.inputFormats.map(x=>x.replace('.','').toUpperCase()).join(', ')} · Processed in your browser</small>
    </div>

    {files.length>0 && <div className="cf-work-area">
      <div className="cf-queue-heading"><div><strong>Your files</strong><span>{files.length} of {tool.maxFiles}</span></div><button className="cf-btn cf-btn-secondary cf-btn-sm" onClick={()=>picker.current?.click()} disabled={busy}><FilePlus2 size={15}/>Add more</button></div>
      <div className="cf-file-list">{files.map(f=><div className="cf-file-row" key={f.id}>
        {f.preview?<ImagePreview src={f.preview} />:<span className="cf-file-thumb cf-file-generic"><FileText size={21}/></span>}
        <div className="cf-file-detail"><strong title={f.file.name}>{f.file.name}</strong><span>{formatBytes(f.file.size)}{f.meta?.width?` · ${f.meta.width} × ${f.meta.height} px`:''}{f.meta?.pages?` · ${f.meta.pages} pages`:''}{f.status==='processing'?' · Processing':f.status==='done'?' · Completed':f.status==='cancelled'?' · Cancelled':f.status==='failed'?' · Failed':''}</span>{f.error&&<small className="cf-error-text">{f.error}</small>}</div>
        <span className={`cf-status cf-status-${f.status}`}>{f.status==='processing'?<LoaderCircle className="cf-spin" size={16}/>:f.status==='done'?<Check size={16}/>:f.status==='failed'?<AlertTriangle size={16}/>:f.status==='cancelled'?<X size={16}/>:<span className="cf-status-dot"/>}{f.status}</span>
        {(tool.slug==='merge-pdf'||tool.slug==='jpg-to-pdf'||tool.slug==='png-to-pdf')&&files.length>1&&<div className="cf-order-buttons"><button className="cf-icon-button" aria-label={`Move ${f.file.name} up`} onClick={()=>moveFile(f.id,-1)} disabled={busy||files[0]?.id===f.id}><ArrowUp size={14}/></button><button className="cf-icon-button" aria-label={`Move ${f.file.name} down`} onClick={()=>moveFile(f.id,1)} disabled={busy||files[files.length-1]?.id===f.id}><ArrowDown size={14}/></button></div>}
        <button className="cf-icon-button" aria-label={`Remove ${f.file.name}`} onClick={()=>removeFile(f.id)} disabled={busy}><Trash2 size={17}/></button>
      </div>)}</div>

      {tool.settings.length>0 && <details className="cf-settings" open><summary>Settings <span>Optional — defaults work for most files</span></summary><div className="cf-settings-grid">{tool.settings.map(s=><SettingControl key={s.key} setting={s} value={settings[s.key] ?? s.default} encodeWebp={capabilities?.encodeWebp} onChange={v=>set(s.key,v)}/>)}</div></details>}
      {capabilities && (unsupportedOutput) && <div className="cf-notice" role="status">This browser cannot encode the selected output format. Choose another format in Settings if one is available, or open the tool in a browser with that codec.</div>}
      {tool.notes?.some(n=>n.includes('memory')||n.includes('canvas')||n.includes('ffmpeg'))&&<p className="cf-limit-note"><AlertTriangle size={15}/>{tool.engine==='ffmpeg'?'Media processing uses significant memory and may be slow on phones.':tool.engine==='canvas'?'Large images may exceed your browser’s canvas or memory limits.':''} Input limit: {formatBytes(tool.maxInputBytes)}.</p>}
      {progress&&<div className="cf-progress-wrap" aria-live="polite"><div className="cf-progress-label"><span>{progress.label}</span><span>{progress.ratio===null?'':`${Math.round(progress.ratio*100)}%`}</span></div><div className="cf-progress-track"><div className={`cf-progress-fill ${progress.ratio===null?'is-indeterminate':''}`} style={progress.ratio===null?undefined:{width:`${Math.max(0,Math.min(100,progress.ratio*100))}%`}}/></div></div>}
      {notice&&<div className="cf-notice" role="alert">{notice}</div>}
      <div className="cf-run-actions">{busy?<button className="cf-btn cf-btn-danger" onClick={()=>void cancel()}><X size={17}/>Cancel</button>:<button className="cf-btn cf-btn-primary cf-btn-lg" onClick={()=>void process()} disabled={!files.some(f=>f.status==='ready') || unsupportedOutput}><Play size={17}/>Convert {files.length>1?`${files.length} files`:''}</button>}{completed&&<button className="cf-btn cf-btn-secondary" onClick={reset}><RotateCcw size={16}/>Start Again</button>}</div>
    </div>}
    {outputs.length>0&&<div className="cf-results" aria-live="polite"><div className="cf-results-head"><div><span className="cf-success-icon"><Check size={18}/></span><div><h2>Your files are ready</h2><p>{outputs.length} output{outputs.length===1?'':'s'} · generated on this device</p></div></div><div className="cf-results-actions"><button className="cf-btn cf-btn-primary" onClick={()=>void downloadAll()}>{outputs.length>1?<><Archive size={17}/>Download All as ZIP</>:<><Download size={17}/>Download</>}</button><button className="cf-btn cf-btn-secondary" onClick={reset}><RotateCcw size={16}/>Start Again</button></div></div>
      <div className="cf-output-list">{outputs.map(o=>{const src=files.find(f=>f.id===o.sourceId) ?? files.find(f=>f.file.name===o.sourceName);const saved=src?savingsPercent(src.file.size,o.size):0;return <div className="cf-output-row" key={o.id}><span className="cf-output-type"><FileText size={20}/></span><div className="cf-output-name"><strong>{o.name}</strong><span>{src?`${formatBytes(src.file.size)} → ${formatBytes(o.size)}${tool.kind==='compress'?` · ${saved>=0?saved+'% smaller':Math.abs(saved)+'% larger'}`:''}`:formatBytes(o.size)}</span></div><button className="cf-btn cf-btn-secondary cf-btn-sm" onClick={()=>downloadBlob(o.blob,o.name)}><Download size={15}/>Download</button></div>})}</div>
    </div>}
  </section>;
}

function SettingControl({setting:s,value,onChange,encodeWebp}:{setting:ToolSetting;value:string|number|boolean;onChange:(v:string|number|boolean)=>void;encodeWebp?:boolean}) {
  const id=`setting-${s.key}`;
  let control;
  if(s.type==='boolean') control=<label className="cf-toggle"><input id={id} type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/><span/>{Boolean(value)?'On':'Off'}</label>;
  else if(s.type==='select') control=<select id={id} className="cf-field" value={String(value)} onChange={e=>onChange(e.target.value)}>{s.options?.filter(o=>!(String(o.value)==='webp'&&encodeWebp===false)).map(o=><option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}</select>;
  else if(s.type==='range') control=<div className="cf-range-row"><input id={id} type="range" min={s.min} max={s.max} step={s.step??1} value={Number(value)} onChange={e=>onChange(Number(e.target.value))}/><strong>{value}{s.unit}</strong></div>;
  else if(s.type==='color') control=<div className="cf-color-row"><input id={id} type="color" value={String(value)} onChange={e=>onChange(e.target.value)}/><span>{String(value)}</span></div>;
  else if(s.type==='crop') control=<input id={id} className="cf-field" value={String(value)} onChange={e=>onChange(e.target.value)} placeholder="full or x,y,width,height (0–1)"/>;
  else control=<div className="cf-input-unit"><input id={id} className="cf-field" type={s.type==='number'?'number':'text'} min={s.min} max={s.max} step={s.step} value={String(value)} onChange={e=>onChange(s.type==='number'?Number(e.target.value):e.target.value)} placeholder={s.type==='pages'?'e.g. 1-3, 5, 8-10':''}/>{s.unit&&<span>{s.unit}</span>}</div>;
  return <div className="cf-setting-field"><label htmlFor={s.type==='boolean'?undefined:id}>{s.label}</label>{control}{s.help&&<small>{s.help}</small>}</div>;
}

function makeOutput(name:string,blob:Blob,source:QFile,meta?:OutputFile['meta']):OutputFile{return{id:uid('out'),name,blob,size:blob.size,sourceId:source.id,sourceName:source.file.name,sourceSize:source.file.size,meta};}

async function runOne(tool:ToolDefinition,file:File,v:Record<string,string|number|boolean>,hooks:{signal:{cancelled:boolean};onProgress:(p:{label?:string;ratio?:number|null})=>void}):Promise<{name:string;blob:Blob;meta?:OutputFile['meta']}[]> {
  const s=(key:string,fallback:string|number|boolean='')=>v[key]??fallback;
  if(tool.engine==='canvas') {
    const {convertImage}=await import('@/lib/engines/image');
    const ext=String(s('outputFormat',tool.defaultOutput??tool.outputFormats[0]??'jpg'));
    let resize={mode:String(s('resizeMode','keep')) as 'keep'|'width'|'height'|'both'|'fit'|'cover'|'percent',width:Number(s('resizeWidth',0)),height:Number(s('resizeHeight',0)),percent:Number(s('resizePercent',100)),maxDimension:Number(s('maxDimension',0))};
    if(tool.slug==='image-compressor')resize={...resize,mode:'keep',maxDimension:Number(s('maxDimension',0))};
    if(tool.slug==='crop-image')resize={...resize,mode:'keep'};
    let crop=null as null|{x:number;y:number;w:number;h:number};
    const cropText=String(s('crop','full'));
    if(tool.slug==='crop-image'&&cropText!=='full'){const n=cropText.split(',').map(Number);if(n.length===4&&n.every(Number.isFinite))crop={x:n[0]!,y:n[1]!,w:n[2]!,h:n[3]!};else throw new Error('Enter crop as normalized x,y,width,height (for example 0.1,0.1,0.8,0.8), or choose full.');}
    if(tool.slug==='crop-image'&&String(s('aspectRatio','free'))!=='free'){
      const ratios:Record<string,number>={'1:1':1,'4:3':4/3,'3:2':3/2,'16:9':16/9,'9:16':9/16,'2:1':2};
      const ratio=ratios[String(s('aspectRatio'))];
      if(ratio){const {readImageSize}=await import('@/lib/engines/image');const size=await readImageSize(file);const r=crop??{x:0,y:0,w:1,h:1};let px=r.x*size.w,py=r.y*size.h,pw=r.w*size.w,ph=r.h*size.h;if(pw/ph>ratio){const nw=ph*ratio;px+=(pw-nw)/2;pw=nw;}else{const nh=pw/ratio;py+=(ph-nh)/2;ph=nh;}crop={x:px/size.w,y:py/size.h,w:pw/size.w,h:ph/size.h};}
    }
    let rotation=0;const flip=String(s('flip','none'));
    if(tool.slug==='rotate-image'){const rot=String(s('rotate','90'));rotation=rot==='custom'?Number(s('angle',0)):Number(rot);}
    const target=String(s('mode','quality'))==='target'?Number(s('targetKb',200))*1024:null;
    const result=await convertImage(file,file.name,{outputExt:ext,quality:Number(s('quality',90)),background:String(s('background','#ffffff')),autoOrient:Boolean(s('autoOrient',true)),resize,crop,rotationDeg:rotation,flipX:flip==='h',flipY:flip==='v',targetBytes:target},{signal:hooks.signal,onProgress:hooks.onProgress});
    return[{name:result.name,blob:result.blob,meta:{width:result.width,height:result.height}}];
  }
  if(tool.engine==='ffmpeg') {
    const {convertMedia}=await import('@/lib/engines/media');
    const result=await convertMedia(file,tool.slug,v,{signal:hooks.signal,onProgress:p=>hooks.onProgress(p)});
    return result.map(x=>({name:x.name,blob:x.blob}));
  }
  const {splitPdf,rotatePdf,deletePdfPages,imagesToPdf,pdfToImages}=await import('@/lib/engines/pdf');
  const data=new Uint8Array(await file.arrayBuffer());
  const input={name:file.name,data};
  const bytesBlob=(name:string,b:Uint8Array,type='application/pdf')=>new Blob([Uint8Array.from(b).buffer],{type});
  if(tool.slug==='split-pdf')return(await splitPdf(input,{mode:String(s('splitMode','ranges')) as 'ranges'|'each'|'every'|'extract',pages:String(s('pages','')),everyN:Number(s('everyN',1)),hooks})).map(x=>({name:x.name,blob:bytesBlob(x.name,x.data)}));
  if(tool.slug==='rotate-pdf'){const x=await rotatePdf(input,{angle:Number(s('angle',90)) as 90|180|270,scope:String(s('scope','all')) as 'all'|'range',pages:String(s('pages','')),relative:String(s('relative','add')) as 'add'|'set',hooks});return[{name:x.name,blob:bytesBlob(x.name,x.data)}];}
  if(tool.slug==='delete-pdf-pages'){const x=await deletePdfPages(input,{mode:String(s('mode','delete')) as 'delete'|'keep',pages:String(s('pages','')),hooks});return[{name:x.name,blob:bytesBlob(x.name,x.data)}];}
  if(tool.slug==='pdf-to-jpg'){
    const x=await pdfToImages(input,{outputExt:String(s('outputFormat','jpg')) as 'jpg'|'png'|'webp',scale:Number(s('scale',2)),pages:String(s('pages','')),quality:Number(s('quality',90)),background:String(s('background','#ffffff')),hooks});
    return x.map(p=>({name:p.name,blob:p.blob,meta:{width:p.width,height:p.height}}));
  }
  if(tool.slug==='jpg-to-pdf'||tool.slug==='png-to-pdf'){
    const {readImageSize}=await import('@/lib/engines/image');const sz=await readImageSize(file);
    const ext=file.name.split('.').pop()!.toLowerCase();const x=await imagesToPdf([{name:file.name,data,ext,width:sz.w,height:sz.h}],{combine:'single',pageSize:String(s('pageSize','fit')) as 'fit'|'a3'|'a4'|'a5'|'letter'|'legal',orientation:String(s('orientation','auto')) as 'auto'|'portrait'|'landscape',marginMm:Number(s('margin',0))});
    return x.map(p=>({name:p.name,blob:bytesBlob(p.name,p.data)}));
  }
  throw new Error(`This ${tool.name} workflow is not available yet.`);
}

function ImagePreview({src}:{src:string}){return <Image src={src} alt="" className="cf-file-thumb" width={42} height={42} unoptimized/>;}
