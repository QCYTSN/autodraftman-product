import type { Box, PresentationCase, Region } from './types';
// Independent centers and equal image units. Blank margins are intentional at edges.
export function evidenceCameras(source: Region, draft: Region): [Box, Box] {
  const regions = [source, draft];
  const s = Math.min(650 / Math.max(160, ...regions.map(r => r.box[2] - r.box[0] + 56)),
    430 / Math.max(120, ...regions.map(r => r.box[3] - r.box[1] + 56)));
  const w = 650 / s, h = 430 / s;
  return regions.map(r => [(r.box[0]+r.box[2]-w)/2, (r.box[1]+r.box[3]-h)/2,w,h] as Box) as [Box, Box];
}
export function repairCamera(data: PresentationCase): Box {
  const [l,t,r,b] = data.repair.region.box;
  const h = Math.max(160,b-t+56), w = h*1010/500;
  return [(l+r-w)/2,(t+b-h)/2,w,h];
}
export function mapBox(box: Box, camera: Box, frame: Box): Box {
  const s = Math.min(frame[2]/camera[2],frame[3]/camera[3]);
  return [frame[0]+(frame[2]-camera[2]*s)/2+(box[0]-camera[0])*s,
    frame[1]+(frame[3]-camera[3]*s)/2+(box[1]-camera[1])*s,box[2]*s,box[3]*s];
}
export const regionBox = ({box:[l,t,r,b]}: Region): Box => [l,t,r-l,b-t];
export function assetConnector(box:Box, frame:Box, slotY:number) {
  const [x,y,w,h]=box,[fx,fy,fw,fh]=frame;
  const distances=[x-fx,fx+fw-x-w,y-fy,fy+fh-y-h];
  const edge=distances.indexOf(Math.min(...distances));
  if(edge===0)return {start:[x,y+h/2],path:'M'+x+' '+(y+h/2)+' H'+(fx-20)+' V'+(fy-2)+' H1048 V'+slotY+' H1108'};
  if(edge===2)return {start:[x+w,y],path:'M'+(x+w)+' '+y+' V'+(fy-2)+' H1048 V'+slotY+' H1108'};
  if(edge===3)return {start:[x+w/2,y+h],path:'M'+(x+w/2)+' '+(y+h)+' V'+(fy+fh+20)+' H1048 V'+slotY+' H1108'};
  return {start:[x+w,y+h/2],path:'M'+(x+w)+' '+(y+h/2)+' H1048 V'+slotY+' H1108'};
}
export function draftObjects(markup: string, data: PresentationCase) {
  const doc = new DOMParser().parseFromString(markup,'image/svg+xml');
  const image = doc.querySelector('image[id]')?.id;
  const shape = data.repair.operations[0].targetId;
  const text = [...doc.querySelectorAll('text[id]')].find(n => n.textContent?.trim() === data.editTarget.originalText)?.id;
  return [{id:image,type:'image' as const},{id:doc.getElementById(shape) ? shape : undefined,type:'shape' as const},{id:text,type:'text' as const}]
    .filter((item): item is {id:string;type:'image'|'shape'|'text'} => Boolean(item.id));
}
