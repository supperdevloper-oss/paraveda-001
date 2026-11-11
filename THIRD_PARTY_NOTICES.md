# Third-party software notices

ConvertFlow combines independently licensed open-source components. The project-level `LICENSE` does not supersede these component licenses. Preserve this file and the `LICENSES/` directory when redistributing the source or static build.

| Component | Use | License | Upstream |
|---|---|---|---|
| FFmpeg WebAssembly core `@ffmpeg/core` 0.12.10 | Browser audio/video codecs; `public/vendor/ffmpeg/core/` in a built site | **GPL-2.0-or-later** | [ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), [FFmpeg](https://ffmpeg.org/) |
| `@ffmpeg/ffmpeg` 0.12.15 | JavaScript worker protocol | MIT | [ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) |
| PDF.js `pdfjs-dist` 6.5.438 | PDF page renderer and worker/fonts | Apache-2.0 | [mozilla/pdf.js](https://github.com/mozilla/pdf.js) |
| `pdf-lib` 1.17.1 | PDF assembly and page editing | MIT | [Hopding/pdf-lib](https://github.com/Hopding/pdf-lib) |
| `fflate` 0.8.2 | ZIP creation | MIT | [101arrowz/fflate](https://github.com/101arrowz/fflate) |
| Next.js, React, Lucide, clsx | Site framework and icons | MIT/ISC as declared by each package | Their respective npm package metadata |

## FFmpeg core notice

The bundled FFmpeg core is distributed under **GNU General Public License version 2 or (at your option) any later version**. The upstream project and source are available at <https://github.com/ffmpegwasm/ffmpeg.wasm>. The core build used here includes GPL-enabled components (including libx264/libx265/libmp3lame); its configure flags are recorded in `src/lib/tools/media-tools.ts`. If you redistribute the built site, keep the GPL notice and make the corresponding source and build materials available to recipients under the applicable GPL terms. Consult a qualified adviser if you need a licensing determination for your use case.

The full GPL-2.0 text is in `LICENSES/GPL-2.0.txt`; Apache-2.0 is in `LICENSES/Apache-2.0.txt`. The package manager lockfile identifies exact dependency versions. This notice is informational and is not legal advice.
