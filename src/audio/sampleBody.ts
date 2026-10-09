export interface SampleBody {offset:number;gain:number}
/** Locate the recorded action once at decode; never boost a truncated quiet lead.
 * The peak bound prevents normalising noisy/quiet clips into a loud transient. */
export function sampleBody(channels:readonly Float32Array[],sampleRate:number):SampleBody {
 if(!channels.length||!Number.isFinite(sampleRate)||sampleRate<=0)return {offset:0,gain:1};
 const length=Math.min(...channels.map(c=>c.length)),frame=Math.max(1,Math.round(sampleRate*.01));let peak=0,maxRms=0;const energy:number[]=[];
 for(let at=0;at<length;at+=frame){let sum=0,n=0;for(const channel of channels)for(let i=at;i<Math.min(length,at+frame);i++){const value=Number.isFinite(channel[i])?channel[i]:0;peak=Math.max(peak,Math.abs(value));sum+=value*value;n++;}const rms=Math.sqrt(sum/Math.max(1,n));energy.push(rms);maxRms=Math.max(maxRms,rms);}
 if(peak<.0001||maxRms<.0001)return {offset:0,gain:1};
 const onset=Math.max(0,energy.findIndex(r=>r>=maxRms*.10)*frame/sampleRate-.008),active=energy.filter(r=>r>=maxRms*.10),rms=Math.sqrt(active.reduce((s,r)=>s+r*r,0)/active.length);
 return {offset:Math.min(onset,Math.max(0,length/sampleRate-.035)),gain:Math.min(3,.80/peak,.16/Math.max(rms,.0001))};
}
