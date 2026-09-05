import productData from './products.json';
import standards from './standards.json';
export type Product = {id:string;name:string;brand:string;category:string;basis:number;price:number;nutrients:Record<string,number>;stock:number;expiry:string;donor:string};
export type Animal = {id:string;name:string;cage:string;weight:number;age:number;status:string;notes:string;arrival:string;feed:{productId:string;grams:number;active?:boolean}[]};
export type State = {name:string;donation:number;animals:Animal[];products:Product[]};
export const initial:State = {name:'행복한 보호소',donation:300000,products:productData as unknown as Product[],animals:[
  ['보리','A-1',7.2,4,'입양대기','', [['food_a',130],['supp_cal',2]]],
  ['초코','A-2',12.5,6,'치료중','슬개골 탈구 회복 중, 체중 관리 필요',[['food_light',180],['supp_joint',3]]],
  ['나비','A-3',4.1,2,'입양대기','',[['food_a',80],['supp_vitd',1]]],
  ['콩이','B-1',9,8,'임보중','노령, 신장 수치 관찰',[['food_senior',150],['supp_omega',2]]],
  ['뭉치','B-2',18.4,3,'입양대기','활동량 많음',[['food_grainfree',260],['multi_a',3]]],
  ['감자','B-3',6.6,5,'입양완료','2026-08-28 입양 확정',[['food_a',110]]],
  ['레오','C-1',14.2,7,'치료중','빈혈 소견, 철분 보충',[['food_puppy_adult',200],['supp_iron',2]]],
  ['구름','C-2',3.3,1,'입양대기','',[['food_a',65],['supp_vitd',2]]],
].map((r,i)=>({id:`animal-${i}`,name:r[0] as string,cage:r[1] as string,weight:r[2] as number,age:r[3] as number,status:r[4] as string,notes:r[5] as string,arrival:'2026-08-15',feed:(r[6] as [string,number][]).map(([productId,grams])=>({productId,grams}))}))};
initial.products.forEach((p,i)=>{p.stock=[11.5,13.1,14.7,14.7,13.4,5.4,12.1,10,5.2,12.5,3.9,11,4.2,6.2,2.5][i];if([2,3,4,9,10,11,12].includes(i))p.donor='한마음 후원회';});
initial.products[0].expiry='2026-08-31';
export function analyze(a:Animal, products:Product[]){return standards.map(s=>{let total=0,count=0,missing=false;for(const f of a.feed){if(f.active===false||f.grams<=0)continue;const p=products.find(p=>p.id===f.productId);if(!p)continue;const n=p.nutrients[s.name];if(n===undefined){missing=true;continue;} total+=n*f.grams/p.basis;if(n>0)count++;}return {...s,total,status:total>s.max?'기준 초과':count>1?'중복 가능':missing?'정보 부족':total<s.min?'참고 미만':'이상 없음'};});}
export function severity(a:Animal,p:Product[]){if(!a.feed.some(f=>f.active!==false))return '정보 부족';const rows=analyze(a,p);return ['기준 초과','중복 가능','정보 부족','참고 미만'].find(s=>rows.some(r=>r.status===s))||'이상 없음';}
export function cost(a:Animal,p:Product[]){return a.feed.reduce((sum,f)=>{if(f.active===false)return sum;const x=p.find(p=>p.id===f.productId);return sum+(x?x.price*f.grams/x.basis:0)},0);}
/** 특정 영양소에 대한 제품별 기여도 (이름, mg, 비중 %). */
export function contributions(a:Animal,products:Product[],nutrientName:string){
  const rows=a.feed.filter(f=>f.active!==false&&f.grams>0).map(f=>{
    const p=products.find(p=>p.id===f.productId);if(!p)return null;
    const n=p.nutrients[nutrientName];if(n===undefined)return null;
    return {name:p.name,mg:n*f.grams/p.basis};
  }).filter((x):x is {name:string;mg:number}=>!!x&&x.mg>0).sort((x,y)=>y.mg-x.mg);
  const total=rows.reduce((s,r)=>s+r.mg,0)||1;
  return rows.map(r=>({...r,pct:r.mg/total*100}));
}
export const money=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
export const amount=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:4});
export function validState(v:unknown):v is State {
 if(!v||typeof v!=='object')return false;const s=v as State;
 const num=(v:unknown,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min;
 const str=(v:unknown)=>typeof v==='string'&&v.length<=2000;
 if(!str(s.name)||!num(s.donation)||!Array.isArray(s.animals)||!Array.isArray(s.products)||s.animals.length>1000||s.products.length>1000)return false;
 if(!s.products.every(p=>str(p.id)&&str(p.name)&&str(p.brand)&&str(p.category)&&str(p.expiry)&&str(p.donor)&&num(p.basis,0.001)&&num(p.price)&&num(p.stock)&&p.nutrients&&typeof p.nutrients==='object'&&Object.values(p.nutrients).every(n=>num(n))))return false;
 const ids=new Set(s.products.map(p=>p.id));
 return ids.size===s.products.length&&new Set(s.animals.map(a=>a.id)).size===s.animals.length&&s.animals.every(a=>str(a.id)&&str(a.name)&&str(a.cage)&&str(a.status)&&str(a.notes)&&str(a.arrival)&&num(a.weight,0.01)&&num(a.age)&&Array.isArray(a.feed)&&a.feed.every(f=>ids.has(f.productId)&&num(f.grams)&&(f.active===undefined||typeof f.active==='boolean')));
}

