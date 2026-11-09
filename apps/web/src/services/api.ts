const BASE=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
export function token(){return localStorage.getItem('misconfig_token');}
export async function api<T>(path:string,init:RequestInit={}):Promise<T>{const headers=new Headers(init.headers);if(!(init.body instanceof FormData))headers.set('Content-Type','application/json');if(token())headers.set('Authorization',`Bearer ${token()}`);const res=await fetch(`${BASE}${path}`,{...init,headers});if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error?.message||`Request failed (${res.status})`);}if(res.status===204)return undefined as T;const body=await res.json();return body.data as T;}
export function saveToken(t:string){localStorage.setItem('misconfig_token',t);}
