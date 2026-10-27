import "jsr:@supabase/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":Deno.env.get("APP_ORIGIN")??"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders}); if(req.method!=="POST")return respond({error:"Méthode non autorisée."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service)return respond({error:"Configuration serveur incomplète."},503); if(!authorization)return respond({error:"Connectez-vous avec le compte destinataire."},401);
 const auth=createClient(url,anon,{global:{headers:{Authorization:authorization}}}),{data:{user},error:authError}=await auth.auth.getUser();
 if(authError||!user)return respond({error:"Session invalide. Reconnectez-vous."},401); if(!user.email||!user.email_confirmed_at)return respond({error:"Vérifiez d’abord votre adresse e-mail."},403);
 let body:{token?:unknown};try{body=await req.json();}catch{return respond({error:"Corps JSON invalide."},400);}
 if(typeof body.token!=="string"||!/^[0-9a-f]{64}$/.test(body.token))return respond({error:"Jeton d’invitation invalide."},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),{data,error}=await db.rpc("accept_organization_invitation",{p_user_id:user.id,p_token_hash:await sha256(body.token)});
 if(error){const status=error.code==="42501"?403:error.code==="23505"?409:400;return respond({error:status===403?"L’adresse vérifiée ne correspond pas à l’invitation ou l’organisation est inactive.":status===409?"Vous êtes déjà membre de cette organisation.":"Invitation invalide, expirée ou déjà utilisée."},status);}
 const row=Array.isArray(data)?data[0]:data;return respond({success:true,organization_id:row?.organization_id,role:row?.member_role});
});