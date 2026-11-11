'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, FileText, Image as ImageIcon, Menu, Music2, Search, Video, X, Zap } from 'lucide-react';
import { SITE } from '@/lib/site-config';
import { CATEGORIES, READY_TOOLS, searchTools } from '@/lib/tools/registry';

const ICONS: Record<string, typeof ImageIcon> = { images: ImageIcon, pdf: FileText, video: Video, audio: Music2, documents: FileText };

export function Header() {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mobile, setMobile] = useState(false);
  const results = useMemo(() => query.trim() ? searchTools(query).slice(0, 7) : [], [query]);
  return <header className="cf-header">
    <div className="cf-container cf-header-inner">
      <Link href="/" className="cf-brand" aria-label={`${SITE.name} home`}><span className="cf-brand-mark"><Zap size={19} fill="currentColor" /></span><span>{SITE.name}</span></Link>
      <button className="cf-mobile-toggle" aria-label={mobile ? 'Close menu' : 'Open menu'} onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</button>
      <nav className={`cf-nav ${mobile ? 'is-open' : ''}`} aria-label="Main navigation">
        {['Convert', 'Compress', 'PDF Tools', 'All Tools'].map((label, idx) => {
          const key = ['convert', 'compress', 'pdf', 'all'][idx]!;
          const entries = idx === 2 ? READY_TOOLS.filter(t => t.category === 'pdf') : idx === 1 ? READY_TOOLS.filter(t => t.kind === 'compress') : idx === 0 ? READY_TOOLS.filter(t => t.kind === 'convert') : READY_TOOLS;
          const groups=CATEGORIES.map(category=>({category,tools:entries.filter(t=>t.category===category.id)})).filter(group=>group.tools.length>0);
          return <div className="cf-nav-group" key={key} onMouseEnter={() => setOpen(key)} onMouseLeave={() => setOpen(null)}>
            <button className="cf-nav-button" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}>{label}<ChevronDown size={14}/></button>
            {open === key && <div className="cf-dropdown">{groups.map(group=><div className="cf-dropdown-group" key={group.category.id}><strong>{group.category.label}</strong>{group.tools.map(t=><Link key={t.slug} href={`/${t.slug}/`} onClick={() => {setOpen(null);setMobile(false)}}>{t.name}</Link>)}</div>)}<Link className="cf-dropdown-all" href="/tools/">Browse all tools <ArrowRight size={14}/></Link></div>}
          </div>;
        })}
      </nav>
      <div className="cf-search-wrap"><Search size={17}/><input aria-label="Search tools" placeholder="Search tools" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('')}}/>{query && <button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}{results.length>0&&<div className="cf-search-results">{results.map(t=><Link href={`/${t.slug}/`} key={t.slug} onClick={()=>setQuery('')}>{t.name}<span>{t.category}</span></Link>)}</div>}</div>
    </div>
  </header>;
}

export function Footer() {
  return <footer className="cf-footer"><div className="cf-container cf-footer-grid"><div><Link href="/" className="cf-brand"><span className="cf-brand-mark"><Zap size={18} fill="currentColor"/></span>{SITE.name}</Link><p>Free file tools, processed in your browser.</p></div><div><strong>Tools</strong><Link href="/tools/">All tools</Link><Link href="/coming-soon/">Coming soon</Link><Link href="/jpg-to-png/">JPG to PNG</Link><Link href="/image-compressor/">Image Compressor</Link><Link href="/merge-pdf/">Merge PDF</Link></div><div><strong>About</strong><Link href="/about/">About</Link><Link href="/privacy/">Privacy</Link><Link href="/terms/">Terms</Link></div><div><strong>Processing</strong><p>Image and PDF tools run locally in your browser. Media tools use FFmpeg WebAssembly in this tab. Files are not sent to {SITE.name}.</p></div></div><div className="cf-container cf-footer-bottom">© {SITE.copyrightYear} {SITE.name}. Free to use. Hosting and bandwidth costs depend on your provider.</div></footer>;
}

export function ToolCard({ tool }: { tool: (typeof READY_TOOLS)[number] }) {
  const Icon = ICONS[tool.category] ?? FileText;
  return <Link className="cf-tool-card" href={`/${tool.slug}/`}><span className="cf-tool-icon"><Icon size={21}/></span><span className="cf-tool-card-body"><strong>{tool.name}</strong><small>{tool.category.toUpperCase()} · {tool.kind}</small></span><ArrowRight size={17} className="cf-tool-arrow"/></Link>;
}
