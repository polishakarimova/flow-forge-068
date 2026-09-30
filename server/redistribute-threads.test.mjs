import test from 'node:test';
import assert from 'node:assert/strict';
import {redistributeThreads} from './redistribute-threads.mjs';

test('30 drafts become 5 today, four days of 6 and a final post; texts and other formats stay exact',()=>{
  const ids=['a','b','c'];const other={id:'story',format:'Сторис',parts:[{text:'Keep',published:true}]};
  const source={schema:1,items:[other,...ids.map((id,day)=>({id,format:'Threads',parts:Array.from({length:10},(_,i)=>({id:`part-${day*10+i}`,text:`Text ${day*10+i}`,published:false,approvalStatus:'draft'}))}))]};
  const result=redistributeThreads(source,ids,'2026-09-30');
  assert.deepEqual(result.series.map(x=>x.parts.length),[5,6,6,6,6,1]);
  assert.deepEqual(result.series.map(x=>x.date),['2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05']);
  assert.deepEqual(result.series[0].parts.map(x=>x.scheduledAt.slice(11,16)),['14:00','15:00','16:00','17:00','18:00']);
  assert.deepEqual(result.series.flatMap(x=>x.parts).map(x=>x.text),source.items.slice(1).flatMap(x=>x.parts).map(x=>x.text));
  assert.deepEqual(result.data.items[0],other);
});
