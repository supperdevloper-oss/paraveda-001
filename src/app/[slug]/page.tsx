import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { getRoutableTool, relatedTools, routableSlugs } from '@/lib/tools/registry';
import { SITE, siteUrl } from '@/lib/site-config';
import { ToolRunner } from '@/components/tool-runner';
import { ToolCard } from '@/components/site-shell';

export const dynamicParams = false;
export function generateStaticParams(){return routableSlugs().map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const tool=getRoutableTool(slug);if(!tool)return{};const title=tool.title.replace(/\s*\|\s*[^|]+$/i,` | ${SITE.name}`);return{title:{absolute:title},description:tool.description,alternates:{canonical:siteUrl(`/${tool.slug}/`)},openGraph:{title,description:tool.description,type:'website',siteName:SITE.name,url:siteUrl(`/${tool.slug}/`),images:[{url:'/og-image.png',width:1200,height:630,alt:`${SITE.name} — free file tools`}]},twitter:{card:'summary_large_image',title,description:tool.description,images:['/og-image.png']},robots:{index:true,follow:true}};}

export default async function ToolPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const tool=getRoutableTool(slug);if(!tool)notFound();
 const related=relatedTools(tool,4);
 const jsonLd=[
  {'@context':'https://schema.org','@type':'SoftwareApplication',name:tool.name,applicationCategory:'MultimediaApplication',operatingSystem:'Any modern browser',description:tool.description,url:siteUrl(`/${tool.slug}/`),offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},featureList:[...tool.inputFormats.map(x=>`Input ${x}`),...tool.outputFormats.map(x=>`Output ${x}`),'Processed in your browser']},
  {'@context':'https://schema.org','@type':'FAQPage',mainEntity:tool.faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))},
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:siteUrl('/')},{'@type':'ListItem',position:2,name:tool.category.toUpperCase(),item:siteUrl('/tools/')},{'@type':'ListItem',position:3,name:tool.name,item:siteUrl(`/${tool.slug}/`)}]},
 ];
 return <article className="cf-tool-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/><div className="cf-container">
  <nav className="cf-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14}/><Link href="/tools/">{tool.category.toUpperCase()}</Link><ChevronRight size={14}/><span>{tool.name}</span></nav>
  <header className="cf-tool-page-heading"><span className="cf-badge cf-badge-blue">{tool.processing==='in-browser'?'Processed in your browser':'Server processing'}</span><h1>{tool.name}</h1><p>{tool.description}</p><div className="cf-format-row"><span>Input: {tool.inputFormats.map(x=>x.replace('.','').toUpperCase()).join(', ')}</span><ArrowRight size={15}/><span>Output: {tool.outputFormats.map(x=>x.toUpperCase()).join(', ')}</span><span className="cf-dot-sep">·</span><span>Max {Math.round(tool.maxInputBytes/1024/1024)} MB per file</span></div></header>
  <ToolRunner tool={tool}/>
  <section className="cf-tool-explainer cf-section"><div className="cf-content-columns"><div><span className="cf-eyebrow">HOW TO USE</span><h2>Convert in three steps</h2><ol className="cf-numbered-steps">{tool.steps.map((s,i)=><li key={s}><span>{i+1}</span>{s}</li>)}</ol></div><div className="cf-processing-card"><CheckCircle2 size={21}/><h3>Processing location</h3><p>{tool.processing==='in-browser'?`Your selected file is processed locally in this browser tab. ${SITE.name} does not receive the file.`:'This tool uses a server.'}</p><p>Hosting costs, storage and traffic depend on the site owner’s hosting provider.</p></div></div>
  {tool.notes?.length&&<div className="cf-notes-block"><h2>Limits and useful details</h2><ul>{tool.notes.map(n=><li key={n}>{n}</li>)}</ul></div>}
  {tool.about?.map(a=><div className="cf-about-block" key={a.heading}><h2>{a.heading}</h2><p>{a.body}</p></div>)}
  <div className="cf-faq-block"><h2>Frequently asked questions</h2><div className="cf-faq-list">{tool.faq.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div></div>
  </section>
  {related.length>0&&<section className="cf-related"><div className="cf-section-heading"><div><span className="cf-eyebrow">KEEP GOING</span><h2>Related tools</h2></div><Link className="cf-link" href="/tools/">All tools <ArrowRight size={15}/></Link></div><div className="cf-tools-grid">{related.map(t=><ToolCard key={t.slug} tool={t}/>)}</div></section>}
 </div></article>;
}
