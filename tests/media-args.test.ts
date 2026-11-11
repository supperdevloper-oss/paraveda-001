import { describe, expect, it } from 'vitest';
import { buildMediaCommand, parseSegment } from '../src/lib/engines/media-args';

describe('FFmpeg command builders',()=>{
 it('extracts audio with a supported MP3 encoder and optional real trim',()=>{
  const c=buildMediaCommand('mp4-to-mp3','input.mp4',{trim:'10,45',bitrateMode:'192'});
  expect(c.passes[0]!.args).toContain('libmp3lame');
  expect(c.passes[0]!.args.slice(0,4)).toEqual(['-ss','10','-t','35']);
 });
 it('uses H.264 and faststart for MOV conversion; copy is an explicit user option',()=>{
  expect(buildMediaCommand('mov-to-mp4','input.mov',{}).passes[0]!.args).toContain('libx264');
  expect(buildMediaCommand('mov-to-mp4','input.mov',{videoCodec:'copy'}).passes[0]!.args).toContain('copy');
 });
 it('makes GIF palette generation a real two-pass pipeline',()=>{
  const c=buildMediaCommand('video-to-gif','input.mp4',{palette:'high',segment:'1,4'});
  expect(c.passes).toHaveLength(2);
  expect(c.passes[0]!.args.join(' ')).toContain('palettegen');
  expect(c.passes[1]!.args.join(' ')).toContain('paletteuse');
  expect(c.intermediates).toContain('palette.png');
 });
 it('handles malformed time ranges without emitting invalid ffmpeg seek args',()=>{
  expect(parseSegment('wrong')).toBeNull();
  expect(parseSegment('12,7')).toBeNull();
  expect(parseSegment('3,8')).toEqual({start:3,end:8});
 });
});
