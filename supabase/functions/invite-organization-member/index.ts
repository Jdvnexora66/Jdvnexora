import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const appOrigin=Deno.env.get("APP_ORIGIN");
const corsHeaders={"Access-Control-Allow-Origin":appOrigin??"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
async function sha256(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 if(!appOrigin)return respond({error:"Configuration APP_ORIGIN obligatoire."},503);
 const origin=req.headers.get("Origin"); if(origin&&origin!==appOrigin)return respond({error:"Origine non autorisée."},403);
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders}); if(req.method!=="POST")return respond({error:"Méthode non autorisée."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization");
 if(!url||!anon||!service)return respond({error:"Configuration serveur incomplète."},503); if(!authorization)return respond({error:"Authentification requise."},401);
 const auth=createClient(url,anon,{global:{headers:{Authorization:authorization}}}); const {data:{user},error:authError}=await auth.auth.getUser();
 if(authError||!user)return respond({error:"Session invalide. Reconnectez-vous."},401); if(!user.email||!user.email_confirmed_at)return respond({error:"Une adresse e-mail vérifiée est nécessaire."},403);
 let body:{organization_id?:unknown;email?:unknown;role?:unknown}; try{body=await req.json();}catch{return respond({error:"Corps JSON invalide."},400);}
 if(typeof body.organization_id!=="string"||typeof body.email!=="string"||typeof body.role!=="string")return respond({error:"organization_id, email et role sont obligatoires."},400);
 const email=body.email.trim().toLowerCase(); if(email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return respond({error:"Adresse e-mail invalide."},400);
 if(!["admin","manager","member","viewer"].includes(body.role))return respond({error:"Rôle invalide."},400);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),token=randomToken();
 const {data,error}=await db.rpc("create_organization_invitation",{p_organization_id:body.organization_id,p_inviter_id:user.id,p_email:email,p_role:body.role,p_token_hash:await sha256(token)});
 if(error){const status=error.code==="42501"?403:error.code==="23505"?409:400;return respond({error:status===403?"Vous n’êtes pas autorisé à inviter ce rôle.":status===409?"Cette adresse est déjà membre de l’organisation.":"Impossible de créer l’invitation."},status);}
 const row=Array.isArray(data)?data[0]:data,origin=(Deno.env.get("APP_ORIGIN")??"").replace(/\/$/,"");
 return respond({invitation:{id:row?.invitation_id,email,role:body.role,expires_at:row?.expires_at},token,invitation_url:origin?origin+"/?token="+encodeURIComponent(token):null,delivery:"manual",message:"Invitation créée. Transmettez le lien uniquement au destinataire ; l’acceptation exige un compte avec e-mail vérifié correspondant."},201);
});