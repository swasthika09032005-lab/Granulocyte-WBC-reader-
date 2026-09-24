const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let imageData=null,fileName="",analysis=null;
const quiz=[
["Which granulocyte commonly has a multilobed nucleus?",["Neutrophil","Eosinophil","Basophil","Lymphocyte"],0],
["Which granulocyte usually has a bilobed nucleus and orange-red granules?",["Neutrophil","Eosinophil","Basophil","Monocyte"],1],
["Coarse dark blue-purple granules are typical of:",["Eosinophil","Neutrophil","Basophil","Lymphocyte"],2],
["The main teaching clue for a mature neutrophil is:",["Dense purple granules","Nuclear segmentation","Large orange granules","No nucleus"],1],
["Eosinophilic granules are usually:",["Fine and pale","Orange-red and coarse","Black","Absent"],1],
["Basophil granules may:",["Obscure the nucleus","Create RBCs","Remove the membrane","Form 10 lobes"],0],
["A mature neutrophil commonly has approximately:",["0 lobes","2–5 lobes","8–10 lobes","One giant lobe"],1],
["Which is a granulocyte?",["Neutrophil","Lymphocyte","Monocyte","Plasma cell"],0],
["Why can colour-based image matching be unreliable?",["Stain and lighting alter colour","WBCs lack granules","All WBCs look identical","Images cannot be enlarged"],0],
["Final peripheral-smear identification should be confirmed by:",["Browser alone","Trained laboratory professional","Filename","Random guess"],1]
];
let qi=0,qs=0,qdone=false;

$$(".tab").forEach(b=>b.onclick=()=>go(b.dataset.go));
function go(id){$$(".section").forEach(x=>x.classList.toggle("active",x.id===id));$$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.go===id));scrollTo({top:0,behavior:"smooth"})}

$("#file").onchange=e=>{if(e.target.files[0])readFile(e.target.files[0])};
function readFile(f){fileName=f.name||"image";const r=new FileReader();r.onload=()=>show(r.result);r.readAsDataURL(f)}
function show(data){
 imageData=data;$("#preview").src=data;$("#preview").classList.remove("hidden");$("#empty").classList.add("hidden");$("#analyze").disabled=false;
 $("#practiceImg").src=data;$("#practiceImg").classList.remove("hidden");$("#practiceEmpty").classList.add("hidden");
 const im=new Image();im.onload=()=>$("#meta").textContent=`${fileName} • ${im.naturalWidth} × ${im.naturalHeight}px`;im.src=data;
}
$("#clear").onclick=()=>{imageData=null;analysis=null;$("#file").value="";$("#preview").classList.add("hidden");$("#preview").src="";$("#empty").classList.remove("hidden");$("#analyze").disabled=true;$("#meta").textContent="";$("#practiceImg").classList.add("hidden");$("#practiceEmpty").classList.remove("hidden");reset()};
$("#drop").ondragover=e=>e.preventDefault();$("#drop").ondrop=e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/"))readFile(f)};
$$("[data-example]").forEach(b=>b.onclick=()=>{fetch(`assets/${b.dataset.example}-reference.png`).then(r=>r.blob()).then(blob=>readFile(new File([blob],`${b.dataset.example}-reference.png`,{type:blob.type}))).catch(()=>notice("Example reference files are unavailable. Upload your own image.","warn"))});

$("#analyze").onclick=()=>{
 if(!imageData)return;const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),max=700,s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));c.width=Math.max(1,im.naturalWidth*s);c.height=Math.max(1,im.naturalHeight*s);const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(im,0,0,c.width,c.height);const f=features(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height);const scores=score(f);analysis={f,scores};render(scores,f);save(scores)};im.src=imageData;
};
function features(d,w,h){
 let n=0,p=0,o=0,blue=0,red=0,dark=0,sat=0;
 for(let y=0;y<h;y+=Math.max(1,Math.floor(h/260)))for(let x=0;x<w;x+=Math.max(1,Math.floor(w/260))){let i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);n++;if(mx-mn>55)sat++;if(mx<95)dark++;if(b>r*1.1&&b>g*1.02)blue++;if(r>150&&r>g*1.3&&g>b*1.05)o++;if(r>120&&r>g*1.15&&r>b*1.05)red++;if(r>70&&b>65&&b>g*1.03&&r>b*.78)p++}
 const seg=segmentation(d,w,h),bil=Math.max(0,1-Math.abs(seg-.35)*2.2);
 return {purple:p/n,orange:o/n,blue:red/n+blue/n,dark:dark/n,sat:sat/n,seg,bil};
}
function segmentation(d,w,h){
 const a=Array(25).fill(0);
 for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){let i=(y*w+x)*4;if(d[i]<105&&d[i+1]<95&&d[i+2]<125){let gx=Math.min(4,Math.floor(x/w*5)),gy=Math.min(4,Math.floor(y/h*5));a[gy*5+gx]++}}
 const m=a.reduce((x,y)=>x+y,0)/25||1,v=a.reduce((s,x)=>s+(x-m)**2,0)/25;
 return Math.min(1,a.filter(x=>x>m*.75).length/25*.55+Math.sqrt(v)/(m+1)*.65);
}
function score(f){
 const orange=Math.min(1,f.orange*5+f.blue*.5), purple=Math.min(1,f.purple*4+f.blue*1.8), density=Math.min(1,f.dark*3+f.sat*.4);
 let raw={Neutrophil:.5+.5*f.seg+.05*f.bil-.12*orange-.10*purple-.04*f.sat,Eosinophil:.25+.58*orange+.18*f.sat+.2*f.bil-.1*purple-.1*f.seg,Basophil:.22+.6*purple+.18*f.sat+.22*density-.2*orange-.18*f.seg};
 let v=Object.values(raw),mn=Math.min(...v),mx=Math.max(...v),out={};Object.keys(raw).forEach(k=>out[k]=Math.max(1,Math.min(95,Math.round(100*(raw[k]-mn+.18)/(mx-mn+.54)))));return out;
}
function render(s,f){
 const arr=Object.entries(s).sort((a,b)=>b[1]-a[1]),name=arr[0][0],top=arr[0][1],gap=top-arr[1][1],conf=top>=80&&gap>=15?"High":top>=60&&gap>=10?"Moderate":top>=40?"Low":"Very low";
 $("#name").textContent=name;$("#summary").textContent=`Most similar educational morphology pattern: ${top}%`;$("#topScore").textContent=top+"%";
 setbar("n",s.Neutrophil);setbar("e",s.Eosinophil);setbar("b",s.Basophil);$("#confidence").textContent=`Confidence: ${conf}`;
 $("#confidenceText").textContent=gap<8?"Borderline result — manual microscopic confirmation is recommended.":"This browser-based similarity estimate is not a clinical diagnosis.";
 let why=[];if(name==="Neutrophil"){if(f.seg>.45)why.push("Segmented/irregular nuclear distribution was suggested.");if(f.orange<.08)why.push("No strong orange-red component was detected.");}
 if(name==="Eosinophil"){if(f.orange>.05)why.push("A warm orange-red component was detected.");if(f.bil>.4)why.push("A bilobed-like nuclear distribution was suggested.");}
 if(name==="Basophil"){if(f.purple>.06||f.blue>.03)why.push("A dark blue-purple component was detected.");if(f.dark>.08)why.push("A relatively dense dark-pixel pattern was detected.");}
 why.push(`Overall features were closest to the ${name.toLowerCase()} reference profile.`,"Stain, camera, lighting and focus can change image features.");
 $("#why").innerHTML=why.map(x=>`<li>${x}</li>`).join("");
 if(top<45||gap<8)notice("Image quality or morphology overlap may limit the match. Use a focused single-cell smear image and confirm manually.","warn");
 else $("#quality").classList.add("hidden");
}
function setbar(p,v){$(`#${p}Score`).textContent=v+"%";$(`#${p}Bar`).style.width=v+"%"}
function reset(){ $("#name").textContent="No analysis yet";$("#summary").textContent="Upload an image to begin.";$("#topScore").textContent="—";["n","e","b"].forEach(p=>setbar(p,0));$("#confidence").textContent="Confidence: —";$("#confidenceText").textContent="This is a similarity estimate, not a clinical diagnosis.";$("#why").innerHTML="<li>Analysis results will appear here.</li>"}
function notice(t,type=""){const x=$("#quality");x.textContent=t;x.className="notice "+type}

$$(".answers button").forEach(b=>b.onclick=()=>{const pred=analysis?Object.entries(analysis.scores).sort((a,b)=>b[1]-a[1])[0][0]:null;if(!pred){notice2("Upload and analyze an image first.","warn");return}const f=$("#feedback");f.textContent=b.dataset.answer===pred?`Correct according to the reader's current match: ${pred}. Confirm the morphology manually.`:`The reader's current match is ${pred}. Review the comparator and try again.`;f.className="notice "+(b.dataset.answer===pred?"good":"warn")});
function notice2(t,c){const f=$("#feedback");f.textContent=t;f.className="notice "+c}

function save(s){const a=Object.entries(s).sort((x,y)=>y[1]-x[1]),gap=a[0][1]-a[1][1],c=a[0][1]>=80&&gap>=15?"High":a[0][1]>=60&&gap>=10?"Moderate":a[0][1]>=40?"Low":"Very low";let h=JSON.parse(localStorage.getItem("granulocyteHistory")||"[]");h.unshift({date:new Date().toLocaleString(),file:fileName,match:a[0][0],score:a[0][1],confidence:c});localStorage.setItem("granulocyteHistory",JSON.stringify(h.slice(0,10)));history()}
function history(){const h=JSON.parse(localStorage.getItem("granulocyteHistory")||"[]"),b=$("#historyBody");b.innerHTML=h.length?h.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.file)}</td><td>${esc(x.match)}</td><td>${x.score}%</td><td>${esc(x.confidence)}</td></tr>`).join(""):`<tr><td colspan="5">No analyses saved yet.</td></tr>`}
function esc(x){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("#clearHistory").onclick=()=>{localStorage.removeItem("granulocyteHistory");history()};

function renderQuiz(){qdone=false;$("#next").disabled=true;$("#next").classList.remove("hidden");$("#restart").classList.add("hidden");$("#qFeedback").classList.add("hidden");if(qi>=quiz.length){$("#qProgress").textContent="Quiz complete";$("#question").textContent=`Your score: ${qs}/${quiz.length} (${Math.round(qs/quiz.length*100)}%)` ;$("#options").innerHTML="<p>Review the comparator and try again.</p>";$("#next").classList.add("hidden");$("#restart").classList.remove("hidden");return}let x=quiz[qi];$("#qProgress").textContent=`Question ${qi+1} of ${quiz.length}`;$("#question").textContent=x[0];$("#options").className="option-list";$("#options").innerHTML=x[1].map((o,i)=>`<button class="option" data-i="${i}">${o}</button>`).join("");$$(".option").forEach(b=>b.onclick=()=>answerQuiz(+b.dataset.i))}
function answerQuiz(i){if(qdone)return;qdone=true;let x=quiz[qi];$$(".option").forEach((b,j)=>{b.disabled=true;if(j===x[2])b.classList.add("correct");if(j===i&&i!==x[2])b.classList.add("wrong")});if(i===x[2])qs++;$("#qFeedback").textContent=i===x[2]?"Correct!":"Review the morphology and comparator.";$("#qFeedback").className="notice "+(i===x[2]?"good":"warn");$("#qFeedback").classList.remove("hidden");$("#next").disabled=false}
$("#next").onclick=()=>{qi++;renderQuiz()};$("#restart").onclick=()=>{qi=0;qs=0;renderQuiz()};
history();renderQuiz();reset();
