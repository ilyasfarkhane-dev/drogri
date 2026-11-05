import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import mysql from 'mysql2';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
export const config={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'drogopro',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'drogopro',decimalNumbers:true,dateStrings:true,timezone:'+01:00'};
const pool=mysql.createPool({...config,connectionLimit:10});
pool.on('connection',c=>c.query("SET time_zone='+01:00'"));
export const db=pool.promise();
export async function tx(fn){const c=await db.getConnection();try{await c.beginTransaction();const v=await fn(c);await c.commit();return v;}catch(e){await c.rollback();throw e;}finally{c.release();}}
