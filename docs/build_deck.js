const pptx = require('pptxgenjs')
const p = new pptx()
p.layout = 'LAYOUT_WIDE'            // 13.33 x 7.5
p.author = 'Foresight Labs'
p.title  = 'Foresight RM — Julius Baer Wealth Intelligence'

const NAVY='141E55', INK='1D2A6D', MUT='5E6976', LIGHT='F6F7F9',
      IRON='CCD0D1', RED='A8322B', GOLD='A68430', GRN='2C6A4F', W='FFFFFF'
const S='screens/', I='icons/'
const H='Calibri', B='Calibri'

// tracked caps, the Julius Baer heading treatment
const cap = (t,o={}) => ({ text:t, options:{ fontFace:H, charSpacing:3.5, bold:false, ...o } })

function eyebrow(s,t,x,y,color=GOLD){
  s.addText(t,{x,y,w:9,h:0.28,fontFace:H,fontSize:13,color,charSpacing:3,isTextBox:true,margin:0})
}
function title(s,t,x,y,color=NAVY,size=34,w=11.9){
  s.addText(t.toUpperCase(),{x,y,w,h:0.85,fontFace:H,fontSize:size,color,charSpacing:3.5,isTextBox:true,margin:0,valign:'top'})
}
function icon(s,name,x,y,size=0.34){ s.addImage({path:I+name+'.png',x,y,w:size,h:size}) }
function foot(s,t){
  s.addText(t,{x:0.7,y:6.95,w:11.9,h:0.3,fontFace:B,fontSize:11.5,color:'8B96A3',isTextBox:true,margin:0})
}

/* 1 ─ title */
let s = p.addSlide(); s.background={color:NAVY}
s.addText('FORESIGHT RM',{x:0.9,y:2.25,w:11.5,h:1.0,fontFace:H,fontSize:52,color:W,charSpacing:8,isTextBox:true,margin:0})
s.addText('The bank already knows. It has never told anyone.',
  {x:0.9,y:3.35,w:11,h:0.6,fontFace:H,fontSize:23,color:'A3B1E5',isTextBox:true,margin:0})
s.addText([
  {text:'Julius Baer · Wealth Intelligence',options:{breakLine:true}},
  {text:'Foresight Labs · SingHacks 2026',options:{}}],
  {x:0.9,y:4.5,w:8,h:0.9,fontFace:B,fontSize:14.5,color:'7186D3',lineSpacing:22,isTextBox:true,margin:0})
s.addText('20 clients · 6 agents · 12 data files · 28 RM notes',
  {x:0.9,y:6.35,w:11,h:0.4,fontFace:H,fontSize:13.5,color:'4A5FBD',charSpacing:2,isTextBox:true,margin:0})
s.addNotes('Open on the thesis: the information already exists inside the bank. It is held in systems that do not speak to each other.')

/* 2 ─ the problem */
s = p.addSlide(); s.background={color:W}
eyebrow(s,'THE PROBLEM',0.7,0.55)
title(s,'Six holdings. Every one inside its limit.',0.7,0.95)
s.addText([
  {text:'Lau Chi Ming holds an apartment, a share, a bond and a derivative.',options:{breakLine:true}},
  {text:'The bank shows six tidy rows. Nothing is flagged, because nothing ',options:{breakLine:true}},
  {text:'individually breaks a rule.',options:{}}],
  {x:0.7,y:2.05,w:5.1,h:1.4,fontFace:B,fontSize:16.5,color:MUT,lineSpacing:26,isTextBox:true,margin:0})
s.addText('This is what every wealth platform shows today.',
  {x:0.7,y:3.6,w:5.1,h:0.6,fontFace:H,fontSize:17.5,color:NAVY,italic:true,isTextBox:true,margin:0})
s.addImage({path:S+'c-reveal-before.png',x:6.15,y:1.6,w:6.5,h:2.24})
foot(s,'Screen: Client 360 → Exposure, before the reveal')
s.addNotes('Six positions, each within its own limit, nothing flagged. This is what a wealth platform shows today. Pause here before the next slide.')

/* 3 ─ the number */
s = p.addSlide(); s.background={color:NAVY}
eyebrow(s,'ONE CLICK LATER',0.7,0.55,'C9A94A')
s.addText('49.0%',{x:0.7,y:1.15,w:5,h:1.5,fontFace:H,fontSize:88,color:W,bold:false,isTextBox:true,margin:0})
s.addText('of his wealth is one Hong Kong property bet',
  {x:0.72,y:2.6,w:5,h:0.9,fontFace:H,fontSize:18,color:'CCD5F2',isTextBox:true,margin:0})
s.addText([
  {text:'A structured product hid the exposure behind a wrapper.',options:{breakLine:true,bullet:true}},
  {text:'His loan is secured on the same asset.',options:{breakLine:true,bullet:true}},
  {text:'His career is Hong Kong property development.',options:{breakLine:true,bullet:true}},
  {text:'He owes HKD 60m to a project in November.',options:{bullet:true}}],
  {x:0.85,y:3.9,w:4.9,h:2.0,fontFace:B,fontSize:15,color:'A3B1E5',paraSpaceAfter:9,isTextBox:true,margin:0})
s.addImage({path:S+'c-reveal-after.png',x:6.15,y:1.55,w:6.5,h:2.6})
s.addText('Mandate limit for a single position: 10%',
  {x:6.15,y:4.35,w:6.5,h:0.4,fontFace:H,fontSize:14.5,color:'C9A94A',charSpacing:1,isTextBox:true,margin:0})
s.addNotes('One click resolves the six positions into a single correlated bet: 49.0% of wealth against a 10% single-position limit, plus three exposures held outside the portfolio entirely. Pause after the limit figure.')

/* 4 ─ why nobody saw it */
s = p.addSlide(); s.background={color:W}
eyebrow(s,'WHY NOBODY SAW IT',0.7,0.55)
title(s,'Three systems that never speak',0.7,0.95)
const boxes=[
  ['PORTFOLIO SYSTEM','Six separate holdings','“All fine”'],
  ['CREDIT SYSTEM','One loan, well covered','“All fine”'],
  ['CRM NOTES','A note nobody queries','never read']]
boxes.forEach(([h1,h2,h3],i)=>{
  const x=0.7+i*4.05
  s.addShape(p.ShapeType.roundRect,{x,y:2.1,w:3.75,h:1.9,fill:{color:LIGHT},line:{color:IRON,width:1},rectRadius:0.06})
  icon(s,['layers','lock','clock'][i]==='layers'?'exposure-navy':(i===1?'lock-navy':'clock-gold'),x+0.28,2.3,0.3)
  s.addText(h1,{x:x+0.7,y:2.34,w:2.8,h:0.3,fontFace:H,fontSize:12.5,color:MUT,charSpacing:2,isTextBox:true,margin:0})
  s.addText(h2,{x:x+0.28,y:2.82,w:3.2,h:0.4,fontFace:B,fontSize:16,color:NAVY,isTextBox:true,margin:0})
  s.addText(h3,{x:x+0.28,y:3.36,w:3.2,h:0.4,fontFace:H,fontSize:16,color:i===2?RED:GRN,italic:true,isTextBox:true,margin:0})
})
s.addShape(p.ShapeType.roundRect,{x:0.7,y:4.3,w:11.9,h:2.05,fill:{color:'FBF8F0'},line:{color:GOLD,width:1},rectRadius:0.06})
s.addText('And the Relationship Manager had already worked it out.',
  {x:1.05,y:4.5,w:11.2,h:0.4,fontFace:H,fontSize:16,color:GOLD,charSpacing:1.5,isTextBox:true,margin:0})
s.addText('“the perpetual, the shares, the accumulator and his own development business are all the same bet.\nHe said that is why he is confident.”',
  {x:1.05,y:4.95,w:11.2,h:0.85,fontFace:H,fontSize:16.5,color:NAVY,italic:true,lineSpacing:26,isTextBox:true,margin:0})
s.addText('rm_notes.json · N-018 · 5 March 2026 · P. Ong    —    typed, filed, and never read against the numbers',
  {x:1.05,y:5.88,w:11.2,h:0.3,fontFace:B,fontSize:13,color:MUT,isTextBox:true,margin:0})
s.addNotes('Three systems each report no problem. The Relationship Manager had already identified the correlation herself and recorded it on 5 March. Nothing read that note against the portfolio.')

/* 5 ─ what we built */
s = p.addSlide(); s.background={color:W}
eyebrow(s,'WHAT WE BUILT',0.7,0.55)
title(s,'Six agents read all twelve files together',0.7,0.95)
s.addImage({path:S+'c-stats.png',x:0.7,y:2.6,w:11.9,h:1.07})
const ag=[['monitor','01 MONITOR','what changed'],['exposure','02 EXPOSURE','what they really hold'],
          ['resilience','03 RESILIENCE','what breaks first'],['opportunity','04 OPPORTUNITY','what is unclaimed'],
          ['suitability','05 SUITABILITY','breach or authorised'],['relationship','06 RELATIONSHIP','how to say it']]
ag.forEach(([ic,a,b2],i)=>{
  const x=0.7+i*1.985, chair=i===5
  s.addShape(p.ShapeType.ellipse,{x,y:4.35,w:0.52,h:0.52,fill:{color:chair?'F6EFDC':'E6EBF9'}})
  icon(s,ic+(chair?'-gold':'-navy'),x+0.115,4.465,0.29)
  s.addText(a,{x,y:4.98,w:1.92,h:0.26,fontFace:H,fontSize:11,color:chair?GOLD:INK,charSpacing:1,isTextBox:true,margin:0})
  s.addText(b2,{x,y:5.25,w:1.92,h:0.5,fontFace:B,fontSize:12.5,color:MUT,isTextBox:true,margin:0})
})
s.addText('Detectors compute. Agents narrate. No agent originates a number.',
  {x:0.7,y:6.15,w:11.9,h:0.4,fontFace:H,fontSize:16.5,color:NAVY,charSpacing:1,isTextBox:true,margin:0})

s.addNotes('Six agents read all twelve source files together. Every figure is computed in Python; the model narrates and translates but never originates a number.')

/* 6 ─ the differentiator */
s = p.addSlide(); s.background={color:W}
icon(s,'gate-gold',0.7,0.5,0.3)
eyebrow(s,'THE DIFFERENTIATOR',1.12,0.55,RED)
title(s,'Our AI overrules itself',0.7,0.95)
s.addText('Suitability calls Margarethe a critical breach: 71.46% equity against a 10–30% band. It is right. Relationship objects — she was widowed six months ago and asked that nothing be changed. The gate holds the finding, and gives the RM a different door in.',
  {x:0.7,y:1.95,w:11.9,h:0.85,fontFace:B,fontSize:16,color:MUT,lineSpacing:24,isTextBox:true,margin:0})
s.addImage({path:S+'c-desk.png',x:1.93,y:2.95,w:9.47,h:3.95})
foot(s,'Screen: The Desk — every objection is extracted from a dated, attributed RM note')
s.addNotes('Suitability correctly identifies a critical breach. The Relationship agent objects on a dated client instruction, and the gate holds the finding with a reason and a revisit date. The system can overrule its own analysis when a human fact requires it.')

/* 7 ─ what could happen next */
s = p.addSlide(); s.background={color:W}
eyebrow(s,'WHAT COULD HAPPEN NEXT',0.7,0.55)
title(s,'One client, and the whole book',0.7,0.95)
s.addText([
  {text:'Lau’s loan is secured on the very thing he is concentrated in,',options:{breakLine:true}},
  {text:'so selling to raise cash makes the ratio worse, not better.',options:{}}],
  {x:0.7,y:2.0,w:5.0,h:1.1,fontFace:B,fontSize:16,color:MUT,lineSpacing:25,isTextBox:true,margin:0})
s.addText('COMPUTED FROM HIS CREDIT FILE',
  {x:0.7,y:3.28,w:5.0,h:0.3,fontFace:H,fontSize:11,color:GRN,charSpacing:2,isTextBox:true,margin:0})
;[['Today','69.41%',GRN],['−5%','73.06%',RED],['−10%','77.12%',RED],['−20%','86.76%',RED]].forEach(([k,v,c],i)=>{
  const y=3.72+i*0.6
  s.addText(k,{x:0.7,y,w:1.4,h:0.4,fontFace:B,fontSize:16,color:MUT,isTextBox:true,margin:0})
  s.addText(v,{x:2.05,y:y-0.06,w:1.8,h:0.5,fontFace:H,fontSize:22,color:c,isTextBox:true,margin:0})
  if(i>0) s.addText('margin call',{x:3.9,y:y+0.03,w:1.7,h:0.35,fontFace:H,fontSize:13,color:RED,charSpacing:1,isTextBox:true,margin:0})
})
s.addImage({path:S+'c-simulator.png',x:6.15,y:1.85,w:6.5,h:2.98})
s.addText('AND THE SAME SHOCK ACROSS ALL TWENTY',
  {x:6.15,y:5.0,w:6.5,h:0.3,fontFace:H,fontSize:11,color:GOLD,charSpacing:2,isTextBox:true,margin:0})
s.addText('Four macro scenarios re-rank the book in place. Selecting a Middle East oil shock moves Lau to the top of Priscilla’s list, and Elena with him on commodities.',
  {x:6.15,y:5.35,w:6.5,h:0.9,fontFace:B,fontSize:14,color:MUT,lineSpacing:22,isTextBox:true,margin:0})
foot(s,'Left: loan-to-value computed from the credit facility under collateral shocks. Right: scenario definitions are ours; every figure quoted inside them is read from the dataset')
s.addNotes('The brief asks what could happen next, and the answer works at two scales. Per client, the loan-to-value figures are computed from the actual credit facility under collateral shocks. Across the book, four macro scenarios re-rank all twenty clients in place — a Middle East oil shock moves Lau to the top of the list. If asked: the scenario definitions are ours, and every figure quoted inside them is read from the dataset.')


/* 8 ─ not every reason to call is a risk */
s = p.addSlide(); s.background={color:W}
icon(s,'bell-gold',0.7,0.5,0.3)
eyebrow(s,'THE OTHER HALF OF THE JOB',1.12,0.55)
title(s,'Not every reason to call is a risk',0.7,0.95)
s.addText('A risk engine only ever tells her something is wrong. Much of an RM’s job is the opposite — a relationship reason to call when no finding is outstanding: months of silence, a review falling due, a holiday in the client’s own jurisdiction.',
  {x:0.7,y:2.0,w:6.4,h:1.1,fontFace:B,fontSize:16,color:MUT,lineSpacing:26,isTextBox:true,margin:0})
;[['clock-navy','180 days','since anyone spoke to Grace Adeyemi-Lim — USD 19.1m, and no finding is above threshold'],
  ['bell-navy','5 days','until Tan Boon Huat’s review falls due, on the anniversary of a 23-year relationship'],
  ['globe-navy','Mid-Autumn','a public holiday in the Hong Kong booking centre — greeting drafted, the RM chooses who receives it']
].forEach(([ic,k,d],i)=>{
  const y=3.35+i*1.15
  s.addShape(p.ShapeType.ellipse,{x:0.7,y,w:0.5,h:0.5,fill:{color:'E6EBF9'}})
  icon(s,ic,0.81,y+0.11,0.28)
  s.addText(k,{x:1.4,y:y-0.04,w:5.6,h:0.34,fontFace:H,fontSize:17,color:NAVY,isTextBox:true,margin:0})
  s.addText(d,{x:1.4,y:y+0.32,w:5.6,h:0.62,fontFace:B,fontSize:13,color:MUT,lineSpacing:19,isTextBox:true,margin:0})
})
s.addImage({path:S+'c-concierge.png',x:8.05,y:1.5,w:2.55,h:5.23})
foot(s,'Screen: Relationship Concierge — contact gaps and compliance dates are computed from the data; greetings are drafted for the RM to choose')
s.addNotes('Contact gaps and compliance dates are computed from the data. Greetings are drafted for the RM to select; the system does not assume a client observes any particular occasion.')

/* 9 ─ trust */
s = p.addSlide(); s.background={color:LIGHT}
eyebrow(s,'WHY A BANK COULD RUN THIS',0.7,0.55)
title(s,'Every number is checkable',0.7,0.95)
const t=[['8','deliberate data traps in the dataset, each handled in named code'],
         ['48','findings, every one carrying its file, row and dated note'],
         ['1','command — python backend/verify.py — prints every claim with its source rows']]
t.forEach(([n,d],i)=>{
  const y=2.05+i*1.25
  s.addText(n,{x:0.7,y:y-0.12,w:1.3,h:0.9,fontFace:H,fontSize:44,color:NAVY,isTextBox:true,margin:0})
  s.addText(d,{x:2.1,y:y+0.12,w:4.3,h:0.9,fontFace:B,fontSize:15,color:MUT,lineSpacing:21,isTextBox:true,margin:0})
})
s.addImage({path:S+'08-integrity.png',x:6.6,y:1.85,w:6.0,h:3.67})
s.addText('Custody accounts carry no mandate. A documented waiver is not a breach. Missing cost basis means we decline to quote a gain.',
  {x:0.7,y:6.0,w:11.9,h:0.6,fontFace:H,fontSize:16,color:NAVY,italic:true,lineSpacing:22,isTextBox:true,margin:0})
s.addNotes('The dataset contains deliberate production artefacts. Each is handled in named code, and a single command reproduces every headline figure with its source rows.')

/* 10 ─ the RM stays central */
s = p.addSlide(); s.background={color:W}
eyebrow(s,'STRATEGIC IMPACT',0.7,0.55)
title(s,'The RM stays at the centre',0.7,0.95)
s.addText([
  {text:'Nothing reaches a client without her approval.',options:{breakLine:true,bullet:true}},
  {text:'Drafts are written in the client’s own reporting language.',options:{breakLine:true,bullet:true}},
  {text:'Every approval is stored with the original AI draft beside it.',options:{breakLine:true,bullet:true}},
  {text:'If she leaves, 23 years of relationship does not leave with her.',options:{bullet:true}}],
  {x:0.85,y:2.05,w:5.0,h:2.0,fontFace:B,fontSize:16,color:MUT,paraSpaceAfter:12,isTextBox:true,margin:0})
s.addShape(p.ShapeType.roundRect,{x:0.7,y:4.4,w:5.3,h:1.9,fill:{color:'FBF8F0'},line:{color:GOLD,width:1},rectRadius:0.06})
s.addText('Relationship is the only agent that can veto another. A financial finding can be suppressed by a human fact — never the reverse.',
  {x:1.0,y:4.7,w:4.75,h:1.35,fontFace:H,fontSize:16.5,color:NAVY,lineSpacing:25,isTextBox:true,margin:0})
s.addImage({path:S+'c-brief.png',x:6.35,y:1.95,w:6.28,h:3.6})
foot(s,'Screen: the client-facing draft in Traditional Chinese — every figure in it was computed, and it stays a draft until the RM approves')
s.addNotes('Preserving the central role of the Relationship Manager is a rubric criterion. Here it is architectural: the Relationship agent is the only one able to veto another, and no client communication is sent without RM approval.')

/* 11 ─ closing the loop */
s = p.addSlide(); s.background={color:LIGHT}
icon(s,'mic-navy',0.7,0.5,0.3)
eyebrow(s,'WHERE THIS GOES NEXT',1.12,0.55)
title(s,'Closing the loop',0.7,0.95)
s.addText('The tone analysis already runs. Today it reads the twenty-eight written RM notes and produces the guidance below. Point the same pipeline at a consented meeting transcript and it reads the room instead.',
  {x:0.7,y:1.95,w:11.9,h:0.8,fontFace:B,fontSize:16,color:MUT,lineSpacing:24,isTextBox:true,margin:0})

s.addShape(p.ShapeType.roundRect,{x:0.7,y:2.95,w:5.85,h:2.35,fill:{color:W},line:{color:IRON,width:1},rectRadius:0.06})
s.addText('LIVE TODAY  ·  FROM WRITTEN NOTES',{x:1.0,y:3.15,w:5.3,h:0.3,fontFace:H,fontSize:12.5,color:GRN,charSpacing:2,isTextBox:true,margin:0})
s.addText('“Speak with respect for his entrepreneurial conviction but be direct and grounded in numbers, gently challenging the concentration risk without dismissing his market view.”',
  {x:1.0,y:3.55,w:5.3,h:1.5,fontFace:H,fontSize:15,color:NAVY,italic:true,lineSpacing:22,isTextBox:true,margin:0})

s.addShape(p.ShapeType.roundRect,{x:6.75,y:2.95,w:5.85,h:2.35,fill:{color:'FBF8F0'},line:{color:GOLD,width:1},rectRadius:0.06})
s.addText('NEXT  ·  FROM A CONSENTED TRANSCRIPT',{x:7.05,y:3.15,w:5.3,h:0.3,fontFace:H,fontSize:12.5,color:GOLD,charSpacing:2,isTextBox:true,margin:0})
s.addText([
  {text:'Consent captured before anything records.',options:{breakLine:true,bullet:true}},
  {text:'Tone and concerns extracted from the meeting.',options:{breakLine:true,bullet:true}},
  {text:'Those become constraints — so the gate holds a',options:{breakLine:true,bullet:true}},
  {text:'    recommendation the client is not ready to hear.',options:{}}],
  {x:7.15,y:3.55,w:5.15,h:1.5,fontFace:B,fontSize:12.5,color:MUT,paraSpaceAfter:7,isTextBox:true,margin:0})

s.addImage({path:S+'c-recorder.png',x:0.7,y:5.5,w:1.03,h:1.3})
s.addText('Consent is captured and logged before the microphone opens.',
  {x:1.95,y:5.55,w:4.4,h:0.6,fontFace:B,fontSize:13.5,color:MUT,lineSpacing:20,isTextBox:true,margin:0})
s.addText('Every other tool summarises the meeting and files a note.\nOurs feeds what was said back into what may be said next.',
  {x:6.6,y:5.5,w:6.0,h:1.0,fontFace:H,fontSize:16.5,color:NAVY,lineSpacing:26,isTextBox:true,margin:0})
foot(s,'No transcript exists in the supplied dataset, so none was fabricated — the analysis runs on the real notes instead')
s.addNotes('The same relationship agent currently runs on written RM notes; a consented transcript is the next input channel. Consent capture is built. No transcript exists in the supplied dataset, so none was fabricated.')

/* 12 ─ close */
s = p.addSlide(); s.background={color:NAVY}
eyebrow(s,'FORESIGHT RM',0.9,0.75,'C9A94A')
s.addText([
  {text:'Lau’s flat, shares, bond, derivative, job and loan are one bet —',options:{breakLine:true}},
  {text:'and no system in the bank could see it.',options:{breakLine:true}},
  {text:' ',options:{breakLine:true}},
  {text:'Priscilla worked it out in March and typed it into a note.',options:{breakLine:true}},
  {text:'Nothing read it.',options:{breakLine:true}},
  {text:' ',options:{breakLine:true}},
  {text:'We read the notes with the numbers — and we know when the',options:{breakLine:true}},
  {text:'right answer is still the wrong thing to say.',options:{}}],
  {x:0.9,y:1.85,w:11.5,h:3.6,fontFace:H,fontSize:25,color:W,lineSpacing:40,isTextBox:true,margin:0})
s.addText('github.com/jvvinoth/Foresight-RM',
  {x:0.9,y:6.2,w:11.5,h:0.4,fontFace:B,fontSize:14.5,color:'7186D3',isTextBox:true,margin:0})
s.addNotes('Close on these three sentences, then move to the demonstration.')

p.writeFile({fileName:'Foresight-RM-Pitch.pptx'}).then(f=>console.log('wrote',f))
