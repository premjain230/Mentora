/**
 * Graphs helpers — pure, no mastery write, cool CSS/SVG
 */
export function renderMasteryRadial(container, masteryScore, evidenceStrength){
  const pct = Math.round((masteryScore||0)*100);
  const ev = evidenceStrength<0.35 ? "Limited" : evidenceStrength<0.70 ? "Adequate" : "Strong";
  const color = masteryScore>=0.75 ? "var(--accent2)" : "var(--accent)";
  container.innerHTML = `<div style="display:flex;gap:16px;align-items:center;"><div class="aq-radial" style="--p:${pct};--c:${color}"><span>${pct}%</span></div><div><div style="font-weight:700;">Mastery estimate: ${pct}%</div><div style="font-size:12px;color:var(--text-muted);">Evidence: ${ev} (${Math.round((evidenceStrength||0)*100)}%)</div><div class="aq-bar-track" style="margin-top:8px;width:160px;"><div class="aq-bar-fill" style="width:${pct}%"></div></div></div></div>`;
}
export function renderRetentionTimeline(container, reviews){
  // reviews: array of {conceptId, nextReviewAt, reviewState}
  const sorted = [...reviews].sort((a,b)=> new Date(a.nextReviewAt)-new Date(b.nextReviewAt)).slice(0,5);
  container.innerHTML = `<div class="aq-timeline">${sorted.map((r,i)=>`<div style="position:relative;padding:8px 0 8px 16px;"><div class="aq-dot" style="top:${12+i*2}px;"></div><div style="font-size:13px;"><strong>${r.conceptId}</strong> — ${r.reviewState} <span style="color:var(--text-muted);">${r.nextReviewAt? new Date(r.nextReviewAt).toLocaleDateString(): ""}</span></div></div>`).join("")}</div>`;
}
export function renderProgressSparkline(container, points){
  // points: [0..1] mastery over time - premium gradient
  const w=300, h=60;
  if(!points || points.length<2){ container.innerHTML = `<div style="height:${h}px;display:grid;place-items:center;color:var(--text-muted);font-size:11px;">Not enough data</div>`; return; }
  const path = points.map((p,i)=> `${i===0?'M':'L'} ${(i/(points.length-1))*w} ${h - Math.max(0,Math.min(1,p))*h}`).join(" ");
  container.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;"><defs><linearGradient id="g-${Math.random().toString(36).slice(2,6)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path d="${path} L ${w} ${h} L 0 ${h} Z" fill="url(#g-${Math.random().toString(36).slice(2,6)})" opacity="0.9"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${w}" cy="${h - points[points.length-1]*h}" r="3.5" fill="var(--accent)" stroke="var(--bg-card)" stroke-width="1.5"/></svg>`;
}
export function renderSubjectBars(container, subjectStats){
  // subjectStats: [{name,pct}] sorted desc
  if(!subjectStats || !subjectStats.length){ container.innerHTML = `<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">No subject data yet<br><span style="font-size:10px;">Quiz in any subject to build this</span></div>`; return; }
  const colorFor = (pct)=> pct>=75 ? "var(--accent)" : pct>=50 ? "var(--accent2)" : "var(--accent3)";
  container.innerHTML = subjectStats.slice(0,6).map(s=>`
    <div style="display:flex;flex-direction:column;gap:5px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-size:12px;font-weight:500;max-width:62%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</span><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);">${Math.round(s.pct)}%</span></div>
      <div class="aq-bar-track"><div class="aq-bar-fill" style="width:${Math.round(s.pct)}%;background:${colorFor(s.pct)}"></div></div>
    </div>`).join("");
}
export function renderScoreTrend(canvas, values, opts={}){
  // stock-like — works with 1-2 points, shows preview when empty
  const labels = opts.labels || null; // optional date labels
  if(!canvas || !values || values.length===0){
    const wrap = canvas?.parentElement;
    if(wrap) wrap.innerHTML = `<div style="height:140px;display:grid;place-items:center;color:var(--text-muted);font-size:11px;text-align:center;padding:12px;">No trend yet<br><span style="font-size:10px;">Take a quiz — your stock-like performance line appears here</span><br><a href="quiz.html" style="color:var(--accent);text-decoration:none;font-size:11px;margin-top:6px;display:inline-block;">Take quiz →</a></div>`;
    return;
  }
  if(values.length===1){
    // single point — show as dot with flat line
    values = [values[0], values[0]];
  }
  const dpr = window.devicePixelRatio||1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(260, Math.round(rect.width||300)), H=120;
  canvas.width = W*dpr; canvas.height=H*dpr; canvas.style.width=W+"px"; canvas.style.height=H+"px";
  const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr);
  const pad={top:10,right:10,bottom:18,left:28};
  const chartW=W-pad.left-pad.right, chartH=H-pad.top-pad.bottom;
  const n=values.length; const minV=Math.max(0,Math.min(...values)-8), maxV=Math.min(100,Math.max(...values)+8);
  const xScale=i=> pad.left + (i/(n-1))*chartW;
  const yScale=v=> pad.top+chartH - ((v-minV)/(maxV-minV))*chartH;
  ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1;
  [0,25,50,75,100].forEach(pct=>{
    const v=minV + (maxV-minV)*(pct/100); // grid lines
    const y=yScale(v);
    if(y>=pad.top && y<=pad.top+chartH){ ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+chartW,y); ctx.stroke(); }
  });
  const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+chartH);
  grad.addColorStop(0,"rgba(14,165,233,0.22)"); grad.addColorStop(1,"rgba(14,165,233,0)");
  ctx.beginPath(); values.forEach((v,i)=>{ const x=xScale(i), y=yScale(v); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(xScale(n-1),pad.top+chartH); ctx.lineTo(xScale(0),pad.top+chartH); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle="#0ea5e9"; ctx.lineWidth=2; ctx.lineJoin="round"; ctx.lineCap="round";
  values.forEach((v,i)=>{ const x=xScale(i), y=yScale(v); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke();
  values.forEach((v,i)=>{ const x=xScale(i), y=yScale(v); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle="#0ea5e9"; ctx.fill(); ctx.strokeStyle="#0a0b0f"; ctx.lineWidth=1.2; ctx.stroke(); });
  // X axis labels if provided
  if(labels && labels.length===n){
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font="9px 'Space Mono', monospace"; ctx.textAlign="center";
    labels.forEach((lbl,i)=>{ ctx.fillText(String(lbl).slice(0,6), xScale(i), H-2); });
  } else {
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font="9px 'Space Mono', monospace"; ctx.textAlign="center";
    for(let i=0;i<n;i++){ ctx.fillText(`#${i+1}`, xScale(i), H-2); }
  }
  // Y axis
  ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="9px 'Space Mono', monospace"; ctx.textAlign="right";
  ctx.fillText(Math.round(maxV)+"%", pad.left-4, pad.top+8);
  ctx.fillText(Math.round(minV)+"%", pad.left-4, pad.top+chartH);
}
export function renderVolumeBars(container, dailySeconds){
  // dailySeconds: array length 7, seconds per day
  if(!container) return;
  if(!dailySeconds || dailySeconds.every(v=>!v)){
    container.innerHTML = `<div style="height:56px;display:grid;place-items:center;color:var(--text-muted);font-size:11px;">No volume yet<br><span style="font-size:10px;">Study daily to build volume</span></div>`;
    return;
  }
  const max = Math.max(1, ...dailySeconds);
  const days = ["M","T","W","T","F","S","S"];
  // rotate to start Monday? simple
  container.innerHTML = `<div style="display:flex;align-items:end;gap:6px;height:56px;padding:0 4px;">${dailySeconds.map((s,i)=>`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:100%;height:${Math.max(4, Math.round((s/max)*48))}px;background:${s>0?'linear-gradient(180deg, var(--accent), var(--accent2))':'rgba(255,255,255,0.06)'};border-radius:4px 4px 0 0;opacity:${s>0?1:0.5};"></div>
      <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);">${days[i]||i+1}</span>
    </div>`).join("")}</div>`;
}
export function renderStockChart(canvas, values, opts={}){
  // alias for score trend but taller, with title
  return renderScoreTrend(canvas, values, opts);
}
