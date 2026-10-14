import {ensureBaseSchema} from '../server/schema.mjs';
import {ensureThreadsSchema} from '../server/threads-autopost.mjs';
import {ensureRemoteSchema} from '../server/threads-remote.mjs';
import {ensureAgentSchema} from '../server/agent-api.mjs';
import {ensureSessionSchema} from '../server/session-store.mjs';
import {databasePool,readEnv,fingerprint} from './db-config.mjs';
const env=readEnv(process.argv[2]||'/etc/kartakontenta/migration.env'),pool=databasePool(env);
try{const before=await fingerprint(pool);await ensureBaseSchema(pool);await ensureThreadsSchema(pool);await ensureRemoteSchema(pool);await ensureAgentSchema(pool);await ensureSessionSchema(pool);const after=await fingerprint(pool);if(before.fingerprint!==after.fingerprint||before.rows!==after.rows)throw Error('Workspace changed during migration; inspect before proceeding');console.log(JSON.stringify({ok:true,stateRows:after.rows,workspaceUnchanged:true}));}finally{await pool.end();}
