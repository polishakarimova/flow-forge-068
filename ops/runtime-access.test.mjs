import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRuntimeAccess,requireRuntimeBootstrap,requireLimitedRuntime} from './runtime-access.mjs';
const accessible={migration_create:true,delegate_connect:false,delegate_usage:false,runtime_exists:true,runtime_connect:true,runtime_usage:true,runtime_create:false,runtime_elevated:false};
test('existing limited role works without grant authority',()=>{
  assert.doesNotThrow(()=>requireRuntimeBootstrap(accessible));
});
test('Timeweb migration permissions alone cannot bootstrap a new runtime role',()=>{
  assert.throws(()=>requireRuntimeBootstrap({...accessible,runtime_exists:false,runtime_connect:false,runtime_usage:false}),/CONNECT к default_db, USAGE схемы public/);
});
test('owner grant authority permits bootstrap',()=>{
  assert.doesNotThrow(()=>requireRuntimeBootstrap({...accessible,runtime_exists:false,runtime_connect:false,runtime_usage:false,delegate_connect:true,delegate_usage:true}));
});
test('provider may grant only the missing permission',()=>{
  assert.throws(()=>requireRuntimeBootstrap({...accessible,runtime_connect:false}),/CONNECT к default_db/);
  assert.throws(()=>requireRuntimeBootstrap({...accessible,runtime_usage:false}),/USAGE схемы public/);
});
test('stage cannot reuse an elevated role or bypass missing schema CREATE',()=>{
  assert.throws(()=>requireLimitedRuntime({...accessible,runtime_elevated:true}),/лишние права/);
  assert.throws(()=>requireLimitedRuntime({...accessible,runtime_create:true}),/лишние права/);
  assert.throws(()=>requireRuntimeBootstrap({...accessible,migration_create:false}),/CREATE схемы public/);
});
test('metadata inspection does not issue grants or role changes',async()=>{
  const queries=[];
  const result=await inspectRuntimeAccess({async query(sql){queries.push(sql);return {rows:[accessible]};}});
  assert.equal(result,accessible);
  assert.equal(queries.length,1);
  assert.match(queries[0],/^select/);
  assert.doesNotMatch(queries[0],/\b(?:create role|alter role|password)\b|\bgrant\s+(?:connect|usage|select|all)\b/i);
});