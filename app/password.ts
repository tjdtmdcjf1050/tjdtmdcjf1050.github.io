const enc=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
// Cloudflare Workers accepts at most 100,000 PBKDF2 iterations. Keeping the
// value at that limit prevents production sign-up failures while retaining a
// deliberately expensive, per-user salted password hash.
export const PASSWORD_HASH_ITERATIONS = 100_000;

export async function hashPassword(password:string,saltHex?:string){const salt=saltHex?new Uint8Array(saltHex.match(/.{2}/g)!.map(x=>parseInt(x,16))):crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:PASSWORD_HASH_ITERATIONS},key,256);return{hash:hex(new Uint8Array(bits)),salt:hex(salt)}}
