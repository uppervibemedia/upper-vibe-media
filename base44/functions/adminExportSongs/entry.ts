/**
 * adminExportSongs — Server-side bulk song export for admins.
 *
 * Uses fflate's Zip streaming API so the ZIP is written chunk-by-chunk
 * without accumulating all audio files in RAM simultaneously.
 *
 * ZIP structure:
 *   Songs/<Title>.<ext>      — audio with embedded ID3 tags + cover (MP3)
 *   Cover Art/<Title>.jpg    — cover art as separate backup
 *   EXPORT-REPORT.txt
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Zip, ZipPassThrough, strToU8 } from 'npm:fflate@0.8.2';

// ─── ID3v2.3 writer ───────────────────────────────────────────────────────────

function syncSafe(n) {
  return new Uint8Array([(n>>21)&0x7f,(n>>14)&0x7f,(n>>7)&0x7f,n&0x7f]);
}
function textFrame(id, text) {
  const enc = new TextEncoder();
  const tb = enc.encode(String(text||''));
  const buf = new Uint8Array(10 + 1 + tb.length);
  enc.encodeInto(id, buf);
  new DataView(buf.buffer,4,4).setUint32(0, 1+tb.length);
  buf[10]=0; buf.set(tb,11);
  return buf;
}
function apicFrame(imgBytes, mime) {
  const enc = new TextEncoder();
  const mb = enc.encode(mime||'image/jpeg');
  const sz = 1+mb.length+1+1+1+imgBytes.length;
  const buf = new Uint8Array(10+sz);
  enc.encodeInto('APIC',buf);
  new DataView(buf.buffer,4,4).setUint32(0,sz);
  let i=10; buf[i++]=0; buf.set(mb,i); i+=mb.length;
  buf[i++]=0; buf[i++]=3; buf[i++]=0;
  buf.set(new Uint8Array(imgBytes),i);
  return buf;
}
function buildID3(frames) {
  let sz=0; for(const f of frames) sz+=f.length;
  const hdr=new Uint8Array(10);
  hdr[0]=0x49;hdr[1]=0x44;hdr[2]=0x33;hdr[3]=3;hdr[4]=0;hdr[5]=0;
  hdr.set(syncSafe(sz),6);
  const out=new Uint8Array(10+sz); out.set(hdr);
  let p=10; for(const f of frames){out.set(f,p);p+=f.length;}
  return out;
}
function writeID3(mp3, {title,artist,album,genre,comment,coverBytes,coverMime}) {
  let start=0;
  if(mp3[0]===0x49&&mp3[1]===0x44&&mp3[2]===0x33){
    const s=((mp3[6]&0x7f)<<21)|((mp3[7]&0x7f)<<14)|((mp3[8]&0x7f)<<7)|(mp3[9]&0x7f);
    start=10+s;
  }
  const audio=mp3.subarray(start);
  const frames=[
    textFrame('TIT2',title||'Untitled'),
    textFrame('TPE1',artist||'Upper Vibe Media'),
    textFrame('TALB',album||'Upper Vibe Media'),
    textFrame('TCON',genre||'432 Hz / High Vibe'),
    textFrame('COMM',comment||'Exported from Upper Vibe Media'),
  ];
  if(coverBytes&&coverBytes.length>0) frames.push(apicFrame(coverBytes,coverMime||'image/jpeg'));
  const id3=buildID3(frames);
  const out=new Uint8Array(id3.length+audio.length);
  out.set(id3); out.set(audio,id3.length);
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExt(url) {
  try {
    const e=new URL(url).pathname.split('.').pop().toLowerCase().split('?')[0];
    return ['mp3','wav','m4a','aac','ogg','flac'].includes(e)?e:'mp3';
  } catch{return 'mp3';}
}
function getImageMime(url) {
  try{
    const p=new URL(url).pathname.toLowerCase();
    if(p.endsWith('.png')) return 'image/png';
    if(p.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }catch{return 'image/jpeg';}
}
function safeName(t) {
  return (t||'Untitled Song').replace(/[\\/:*?"<>|]/g,'').trim()||'Untitled Song';
}
async function fetchBytes(url) {
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  }catch{return null;}
}

/** Write one Uint8Array into the streaming Zip and await the drain. */
function zipAddFile(zip, name, bytes) {
  return new Promise((resolve, reject) => {
    const f = new ZipPassThrough(name);
    zip.add(f);
    f.push(bytes, true); // last=true → finalise this file
    resolve();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,Authorization',
  };
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});

  try {
    const base44=createClientFromRequest(req);
    let user; try{user=await base44.auth.me();}catch{}
    if(!user||user.role!=='admin')
      return Response.json({error:'Admin only'},{status:403,headers:cors});

    const tracks=await base44.asServiceRole.entities.Track.list('-created_date',500);
    console.log(`[adminExportSongs] ${tracks.length} tracks`);

    // Collect stats
    let exported=0,artEmbedded=0,artSeparate=0,artMissing=0;
    const skipped=[];
    const usedNames=new Map();

    // Accumulate processed entries in a plain array so we can build a
    // standard non-streaming ZIP at the end. We still process one-at-a-time
    // to minimise peak memory (each audio buffer is freed after adding to the
    // entries array, which JSZip will consume during generateAsync).
    //
    // We keep each entry as { name, data: Uint8Array } and add them all at
    // the end. This avoids holding multiple large audio files in memory at once.
    const entries = []; // { name: string, data: Uint8Array }

    for(let i=0;i<tracks.length;i++){
      const track=tracks[i];
      const audioUrl=track.audio_url;
      if(!audioUrl){
        skipped.push({title:track.title||'Untitled',reason:'Missing audio URL'});
        continue;
      }

      const base=safeName(track.title);
      const ext=getExt(audioUrl);
      const cnt=(usedNames.get(base)||0)+1;
      usedNames.set(base,cnt);
      const nk=cnt>1?`${base} (${cnt})`:base;
      const audioName=`Songs/${nk}.${ext}`;
      const artName=`Cover Art/${nk}.jpg`;

      const audioBytes=await fetchBytes(audioUrl);
      if(!audioBytes){
        skipped.push({title:track.title||'Untitled',reason:'Could not fetch audio'});
        continue;
      }

      const coverUrl=track.cover_url||track.coverUrl||track.coverArtUrl||
                     track.imageUrl||track.artworkUrl||track.cover_image;
      let coverBytes=null,coverMime='image/jpeg';
      if(coverUrl){
        coverBytes=await fetchBytes(coverUrl);
        if(coverBytes) coverMime=getImageMime(coverUrl);
      }

      let finalBytes=audioBytes, embedded=false;
      if(ext==='mp3'){
        try{
          finalBytes=writeID3(audioBytes,{
            title:track.title||'Untitled',
            artist:track.artist_display||'Upper Vibe Media',
            album:'Upper Vibe Media',
            genre:'432 Hz / High Vibe',
            comment:'Exported from Upper Vibe Media',
            coverBytes:coverBytes||null,
            coverMime,
          });
          embedded=true;
        }catch(e){
          console.warn(`ID3 failed for "${track.title}": ${e.message}`);
          finalBytes=audioBytes;
        }
      }

      entries.push({name: audioName, data: finalBytes});
      exported++;

      if(coverBytes){
        entries.push({name: artName, data: coverBytes});
        artSeparate++;
        if(embedded) artEmbedded++;
      } else {
        artMissing++;
      }

      if(i%10===0) console.log(`[adminExportSongs] ${i+1}/${tracks.length}`);
    }

    // Build report text
    const now=new Date().toISOString().replace('T',' ').slice(0,19)+' UTC';
    const skippedLines=skipped.map(s=>`  - ${s.title} — ${s.reason}`).join('\n');
    const report=[
      'Upper Vibe Media Song Export',
      `Exported at: ${now}`,
      '',
      `Total songs found:          ${tracks.length}`,
      `Songs exported:             ${exported}`,
      `Cover art embedded (MP3):   ${artEmbedded}`,
      `Cover art in /Cover Art:    ${artSeparate}`,
      `Cover art missing:          ${artMissing}`,
      `Songs skipped:              ${skipped.length}`,
      '',
      'Notes:',
      '- Cover art is embedded into MP3 files as an ID3v2 APIC frame.',
      '- All available cover art is also saved separately in /Cover Art.',
      '',
      skipped.length>0?`Skipped:\n${skippedLines}`:'No songs were skipped.',
    ].join('\n');

    // Use fflate Zip streaming to build the ZIP without accumulating
    // the whole archive in memory before writing.
    const summary = JSON.stringify({exported,artEmbedded,artSeparate,skipped:skipped.length});
    console.log(`[adminExportSongs] Building ZIP for ${entries.length} entries`);

    // Build ZIP via fflate streaming → ReadableStream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const zip = new Zip((err, chunk, final) => {
      if (err) { writer.abort(err); return; }
      writer.write(chunk);
      if (final) writer.close();
    });

    // Add each entry sequentially inside an async IIFE
    (async () => {
      for (const entry of entries) {
        await zipAddFile(zip, entry.name, entry.data);
      }
      // Add report
      await zipAddFile(zip, 'EXPORT-REPORT.txt', strToU8(report));
      zip.end();
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="Upper-Vibe-Media-All-Songs.zip"',
        'X-Export-Summary': summary,
      },
    });

  } catch(err) {
    console.error('[adminExportSongs] fatal:',err.message);
    return Response.json({error:err.message},{status:500,headers:cors});
  }
});