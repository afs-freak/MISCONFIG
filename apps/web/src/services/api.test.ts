import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {api,saveToken} from './api';

beforeEach(()=>{const store=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k),clear:()=>store.clear()});});
afterEach(()=>{vi.unstubAllGlobals();});
describe('typed API client',()=>{
 it('unwraps the standard data envelope and adds the session token',async()=>{saveToken('test-session');const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{ok:true}}),{status:200,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);await expect(api<{ok:boolean}>('/health')).resolves.toEqual({ok:true});expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer test-session');});
 it('turns server error envelopes into readable errors',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:'Project not found'}}),{status:404,headers:{'Content-Type':'application/json'}})));await expect(api('/projects/missing')).rejects.toThrow('Project not found');});
});
