'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Files, Upload } from 'lucide-react';
import { searchTools } from '@/lib/tools/registry';
import { SITE } from '@/lib/site-config';
import { formatBytes } from '@/lib/utils/format';
import { saveHandoff } from '@/lib/queued-transfer';

export function HomeUploader(){
 const router=useRouter();const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);const [query,setQuery]=useState('');const [drag,setDrag]=useState(false);const [error,setError]=useState('');
 const matches=useMemo(()=>query?searchTools(query).slice(0,8):[],[query]);
 const pick=(incoming:File[])=>{setError('');setFiles(incoming.slice(0,SITE.limits.maxFilesPerRun));if(incoming.length>SITE.limits.maxFilesPerRun)setError(`Choose up to ${SITE.limits.maxFilesPerRun} files at a time.`);};
 const launch=async(slug:string)=>{if(!files.length){setError('Choose at least one file first.');return;}try{await saveHandoff(slug,files);router.push(`/${slug}/`);}catch{setError('Your browser could not prepare those files. Open the tool directly and choose them there.');}};
 const onDrop=(e:DragEvent)=>{e.preventDefault();setDrag(false);pick(Array.from(e.dataTransfer.files));};
 return <div className="cf-home-uploader" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} data-dragging={drag}>
  <input ref={input} className="cf-sr-only" type="file" multiple accept="image/*,application/pdf,video/*,audio/*" onChange={e=>pick(Array.from(e.target.files??[]))}/>
  <span className="cf-upload-icon"><Upload size={25}/></span><h2>{files.length?`${files.length} file${files.length===1?'':'s'} selected`:'Drop files here'}</h2><p>Choose from this device · images up to {formatBytes(SITE.limits.maxImageInputBytes)}, PDF {formatBytes(SITE.limits.maxPdfInputBytes)}, media {formatBytes(SITE.limits.maxMediaInputBytes)}</p>
  <div className="cf-home-upload-actions"><button className="cf-btn cf-btn-primary cf-btn-lg" onClick={()=>input.current?.click()}><Files size={18}/>Choose Files</button>{files.length>0&&<button className="cf-btn cf-btn-secondary" onClick={()=>{setFiles([]);setError('')}}>Clear selection</button>}</div>
  {files.length>0&&<div className="cf-home-filechips">{files.slice(0,3).map((f,i)=><span key={`${f.name}-${i}`}>{f.name} · {formatBytes(f.size)}</span>)}{files.length>3&&<span>+{files.length-3} more</span>}</div>}
  <div className="cf-home-tool-picker"><label htmlFor="home-tool-search">Choose a tool to continue</label><input id="home-tool-search" className="cf-field" placeholder="Search: JPG to PNG, Merge PDF…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&matches[0])void launch(matches[0].slug)}}/>
   {matches.length>0&&<div className="cf-home-tool-suggestions">{matches.map(t=><button key={t.slug} onClick={()=>void launch(t.slug)}>{t.name}<span>{t.category}</span></button>)}</div>}
  </div>{error&&<p className="cf-error-text" role="alert">{error}</p>}<small>Only device selection is offered. Files are stored temporarily in this browser to open the chosen tool; they are not uploaded.</small>
 </div>;
}
