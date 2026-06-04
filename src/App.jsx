import { useEffect, useMemo, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import "./App.css";

const API_BASE = "https://rk-jewellers-backend.onrender.com";
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const formatINR = (value) => "₹ " + toNum(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatDateTime(value) { if(!value) return "Not available"; const d = new Date(value); if(Number.isNaN(d.getTime())) return "Not available"; return `${d.toLocaleDateString("en-IN", { weekday:"long", day:"2-digit", month:"short", year:"numeric" })} || ${d.toLocaleTimeString("en-IN")}`; }
function formatTokenMethod(value){ const v=String(value||"").toLowerCase(); if(v.includes("reconnect")) return "Reconnect to Upstox"; if(v.includes("manual") || v.includes("atu_manual")) return "Manual Method"; return "Not available"; }
const isNumberText = (v) => /^\d*$/.test(v);
function classByReference(price, reference){ const p=toNum(price), r=toNum(reference); if(!r || p===r) return "neutral"; return p>r?"up":"down"; }
function pctText(price, reference){ const p=toNum(price), r=toNum(reference); if(!r) return "0.00%"; const val=((p/r)-1)*100; const sign=val>0?"+":val<0?"-":""; return `${sign}${Math.abs(val).toFixed(2)}%`; }
function diffText(price, reference){ const p=toNum(price), r=toNum(reference); if(!r) return "₹ 0.00"; const diff=p-r; const sign=diff>0?"+":diff<0?"-":""; return `${sign} ${formatINR(Math.abs(diff))}`; }
function arrow(cls){ return cls==="up"?"▲":cls==="down"?"▼":""; }
function calcGoldRates(base, difference = 0){ const gold24 = (toNum(base) + toNum(difference)) / 0.995; return { gold24, gold22: gold24*0.916, gold20: gold24*0.8334, gold18: gold24*0.75, gold14: gold24*0.5834 }; }
function calcSilverRates(base, difference = 0){ const silver1Kg=toNum(base) + toNum(difference); return { silver1Kg, silver10Gram: silver1Kg/100 }; }
function msToTime(ms){ if(!Number.isFinite(ms) || ms<=0) return "Expired / reconnect required"; const s=Math.floor(ms/1000); const d=Math.floor(s/86400); const h=Math.floor((s%86400)/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return `${d}d ${h}h ${m}m ${sec}s`; }

export default function App(){
  const [showSplash,setShowSplash]=useState(true); const [page,setPage]=useState("live"); const [menuOpen,setMenuOpen]=useState(false);
  const [serverStatus,setServerStatus]=useState("Checking server...");
  const [market,setMarket]=useState({ goldMcx:0, silverMcx:0, goldOpen:0, silverOpen:0, goldPrevClose:0, silverPrevClose:0, goldThirdLastClose:0, silverThirdLastClose:0, goldComparisonClose:0, silverComparisonClose:0, marketClosed:false, marketClosedMessage:null, marketClosedReferenceMode:null, goldHigh:0, silverHigh:0, goldLow:0, silverLow:0, accessTokenExpiresAt:null, tokenNeedsReconnect:false, mongoConnected:true, mongoWarning:null, usingRenderBackupToken:false, usingMemoryBackupToken:false, tokenStorage:"none", tokenExpiryDisplay:null, tokenExpired:false, tokenWorking:false, showingLastRecordedData:false, lastRecordedWarning:null, lastRecordedRatesUpdatedAt:null, jwtEnabled:false, adminSession:false, authVerified:false });
  const [goldDifference,setGoldDifference]=useState(0); const [silverDifference,setSilverDifference]=useState(0); const [goldDifferenceUpdatedAt,setGoldDifferenceUpdatedAt]=useState(null); const [silverDifferenceUpdatedAt,setSilverDifferenceUpdatedAt]=useState(null); const [lastUpdated,setLastUpdated]=useState(new Date());
  const [password,setPassword]=useState(""); const [mdrUnlocked,setMdrUnlocked]=useState(false); const [showPasswordBox,setShowPasswordBox]=useState(false);
  const [goldPlus,setGoldPlus]=useState(""); const [goldMinus,setGoldMinus]=useState(""); const [silverPlus,setSilverPlus]=useState(""); const [silverMinus,setSilverMinus]=useState("");
  const [goldPhysical,setGoldPhysical]=useState(""); const [silverPhysical,setSilverPhysical]=useState(""); const [goldDifferenceMcxAtUpdate,setGoldDifferenceMcxAtUpdate]=useState(null); const [silverDifferenceMcxAtUpdate,setSilverDifferenceMcxAtUpdate]=useState(null);
  const [backArmed,setBackArmed]=useState(false); const [showExitConfirm,setShowExitConfirm]=useState(false);
  const [modal,setModal]=useState(null); const [atuUnlocked,setAtuUnlocked]=useState(false); const [atuMode,setAtuMode]=useState("locked");
  const [atuPassword,setAtuPassword]=useState(""); const [atuToken,setAtuToken]=useState(""); const [atuEditable,setAtuEditable]=useState(false); const [currentToken,setCurrentToken]=useState(""); const [currentTokenUpdatedAt,setCurrentTokenUpdatedAt]=useState(null); const [currentTokenGeneratedBy,setCurrentTokenGeneratedBy]=useState(null); const [now,setNow]=useState(Date.now());
  const [adminJwt,setAdminJwt]=useState(""); const [firstRatesLoaded,setFirstRatesLoaded]=useState(false);

  const tokenExpiresAt = market.accessTokenExpiresAt || null;
  const tokenExpiryDisplay = market.tokenExpiryDisplay || tokenExpiresAt || null;
  const tokenRemaining = useMemo(()=> (market.tokenExpired || market.tokenNeedsReconnect) ? "TOKEN EXPIRED OR NOT WORKING" : (tokenExpiresAt ? msToTime(new Date(tokenExpiresAt).getTime()-now) : "Not available"), [tokenExpiresAt, now, market.tokenExpired, market.tokenNeedsReconnect]);

  const showMsg=(message, onOk=null)=>setModal({message,onOk});
  const closeModal=()=>{ const cb=modal?.onOk; setModal(null); if(cb) cb(); };

  const applyRateData=(data)=>{ if(!data) return; setFirstRatesLoaded(true); try{ localStorage.setItem("rk_last_rates", JSON.stringify(data)); }catch{} setMarket((m)=>({ ...m, goldMcx:data.goldMcx??m.goldMcx, silverMcx:data.silverMcx??m.silverMcx, goldOpen:data.goldOpen??m.goldOpen, silverOpen:data.silverOpen??m.silverOpen, goldPrevClose:data.goldPrevClose??m.goldPrevClose, silverPrevClose:data.silverPrevClose??m.silverPrevClose, goldThirdLastClose:data.goldThirdLastClose??m.goldThirdLastClose, silverThirdLastClose:data.silverThirdLastClose??m.silverThirdLastClose, goldComparisonClose:data.goldComparisonClose??m.goldComparisonClose, silverComparisonClose:data.silverComparisonClose??m.silverComparisonClose, marketClosed:data.marketClosed??m.marketClosed, marketClosedMessage:data.marketClosedMessage??m.marketClosedMessage, marketClosedReferenceMode:data.marketClosedReferenceMode??m.marketClosedReferenceMode, goldHigh:data.goldHigh??m.goldHigh, silverHigh:data.silverHigh??m.silverHigh, goldLow:data.goldLow??m.goldLow, silverLow:data.silverLow??m.silverLow, accessTokenExpiresAt:data.accessTokenExpiresAt??m.accessTokenExpiresAt, tokenNeedsReconnect:data.tokenNeedsReconnect??m.tokenNeedsReconnect, mongoConnected:data.mongoConnected??m.mongoConnected, mongoWarning:data.mongoWarning??m.mongoWarning, usingRenderBackupToken:data.usingRenderBackupToken??m.usingRenderBackupToken, usingMemoryBackupToken:data.usingMemoryBackupToken??m.usingMemoryBackupToken, tokenStorage:data.tokenStorage??m.tokenStorage, tokenExpiryDisplay:data.tokenExpiryDisplay??m.tokenExpiryDisplay, tokenExpired:data.tokenExpired??m.tokenExpired, tokenWorking:data.tokenWorking??m.tokenWorking, showingLastRecordedData:data.showingLastRecordedData??m.showingLastRecordedData, lastRecordedWarning:data.lastRecordedWarning??m.lastRecordedWarning, lastRecordedRatesUpdatedAt:data.lastRecordedRatesUpdatedAt??m.lastRecordedRatesUpdatedAt, jwtEnabled:data.jwtEnabled??m.jwtEnabled, adminSession:data.adminSession??m.adminSession, authVerified:data.authVerified??m.authVerified, liveFeedStatus:data.liveFeedStatus??m.liveFeedStatus })); setGoldDifference(data.goldDifference??0); setSilverDifference(data.silverDifference??0); setGoldDifferenceUpdatedAt(data.goldDifferenceUpdatedAt??null); setSilverDifferenceUpdatedAt(data.silverDifferenceUpdatedAt??null); setGoldDifferenceMcxAtUpdate(data.goldDifferenceMcxAtUpdate??null); setSilverDifferenceMcxAtUpdate(data.silverDifferenceMcxAtUpdate??null); if(data.lastUpdated) setLastUpdated(new Date(data.lastUpdated)); };
  async function fetchRates(){ try{ const savedJwt = adminJwt || (()=>{ try{return localStorage.getItem("rk_admin_jwt")||"";}catch{return "";} })(); const headers = savedJwt ? {Authorization:`Bearer ${savedJwt}`} : {}; const r=await fetch(`${API_BASE}/api/rates`,{cache:"no-store",headers}); if(!r.ok) throw new Error(r.status); const d=await r.json(); applyRateData(d); setServerStatus("Online"); }catch(e){ console.error(e); setServerStatus("Offline"); }}
  useEffect(()=>{ document.title="R K JEWELLERS"; try{ const cached=JSON.parse(localStorage.getItem("rk_last_rates")||"null"); if(cached) applyRateData(cached); }catch{} const t=setTimeout(()=>setShowSplash(false),700); const timer=setInterval(()=>setNow(Date.now()),1000); return()=>{clearTimeout(t); clearInterval(timer);};},[]);
  useEffect(()=>{ if(firstRatesLoaded) setShowSplash(false); },[firstRatesLoaded]);
  useEffect(()=>{ fetchRates(); const interval=setInterval(fetchRates,750); const socket=new WebSocket("wss://rk-jewellers-backend.onrender.com/live"); socket.onopen=()=>setServerStatus("Online"); socket.onerror=()=>setServerStatus("Offline"); socket.onmessage=(ev)=>{ try{ const msg=JSON.parse(ev.data); if(msg.type==="rates"){ applyRateData(msg.data); setServerStatus("Online"); }}catch(e){console.error(e);} }; return()=>{ clearInterval(interval); socket.close(); };},[]);
  useEffect(()=>{
    const hp=CapacitorApp.addListener("backButton",()=>{
      if(menuOpen){ setMenuOpen(false); return; }
      if(modal){ closeModal(); return; }
      if(showExitConfirm){ return; }

      if(page!=="live"){
        if(backArmed){
          setPage("live");
          setBackArmed(false);
        }else{
          setBackArmed(true);
          setTimeout(()=>setBackArmed(false),1800);
        }
        return;
      }

      if(page==="live"){
        if(backArmed){
          setShowExitConfirm(true);
          setBackArmed(false);
        }else{
          setBackArmed(true);
          setTimeout(()=>setBackArmed(false),1800);
        }
      }
    });
    return()=>{hp.then(h=>h.remove());};
  },[backArmed,showExitConfirm,page,atuMode,modal,menuOpen]);

  const rawMarket = useMemo(()=>({ goldMcx: toNum(market.goldMcx), silverMcx: toNum(market.silverMcx), goldHigh: toNum(market.goldHigh), goldLow: toNum(market.goldLow), goldOpen: toNum(market.goldOpen), goldPrevClose: toNum(market.goldPrevClose), silverPrevClose: toNum(market.silverPrevClose), goldThirdLastClose: toNum(market.goldThirdLastClose), silverThirdLastClose: toNum(market.silverThirdLastClose), goldComparisonClose: toNum(market.goldComparisonClose), silverComparisonClose: toNum(market.silverComparisonClose), marketClosed: market.marketClosed, marketClosedMessage: market.marketClosedMessage, marketClosedReferenceMode: market.marketClosedReferenceMode, silverHigh: toNum(market.silverHigh), silverLow: toNum(market.silverLow), silverOpen: toNum(market.silverOpen), showingLastRecordedData: market.showingLastRecordedData, lastRecordedWarning: market.lastRecordedWarning, lastRecordedRatesUpdatedAt: market.lastRecordedRatesUpdatedAt }),[market]);
  const rates=useMemo(()=>({ ...calcGoldRates(rawMarket.goldMcx, goldDifference), ...calcSilverRates(rawMarket.silverMcx, silverDifference) }),[rawMarket,goldDifference,silverDifference]);
  const highs=useMemo(()=>({ ...calcGoldRates(rawMarket.goldHigh, goldDifference), ...calcSilverRates(rawMarket.silverHigh, silverDifference) }),[rawMarket,goldDifference,silverDifference]);
  const lows=useMemo(()=>({ ...calcGoldRates(rawMarket.goldLow, goldDifference), ...calcSilverRates(rawMarket.silverLow, silverDifference) }),[rawMarket,goldDifference,silverDifference]);

  function openPage(p){ setBackArmed(false); setPage(p); setMenuOpen(false); if(p!=="mdr"){ setMdrUnlocked(false); setPassword(""); setShowPasswordBox(false); } if(p!=="atu"){ resetAtuState(); }}
  function resetAtuState(){ setAtuUnlocked(false); setAtuMode("locked"); setAtuPassword(""); setAtuToken(""); setAtuEditable(false); setCurrentToken(""); setCurrentTokenUpdatedAt(null); setAdminJwt(""); try{ localStorage.removeItem("rk_admin_jwt"); }catch{} setMarket(m=>({...m, adminSession:false, authVerified:false})); }
  function resetAtuMainSecure(){ setAtuMode("main"); setAtuPassword(""); setAtuToken(""); setAtuEditable(false); setCurrentToken(""); setCurrentTokenUpdatedAt(null); }
  async function unlockMdr(){
    try{
      await adminLogin(password,"settings-update");
      setMdrUnlocked(true); setShowPasswordBox(false); setPassword("");
      setGoldPlus(""); setGoldMinus(""); setGoldPhysical(""); setSilverPlus(""); setSilverMinus(""); setSilverPhysical("");
    }catch(e){
      showMsg("Wrong Password"); setPassword(""); setShowPasswordBox(false);
    }
  }
  const changeBox=(setter,locked=false)=>(v)=>{ if(/^\d*$/.test(v) && !locked) setter(v); };
  const physicalBox=(setter,locked=false)=>(v)=>{ if(/^\d*(\.\d*)?$/.test(v) && !locked) setter(v); };
  async function updateMdrAndLock(){
    const gBlank=goldPlus===""&&goldMinus===""&&goldPhysical==="";
    const sBlank=silverPlus===""&&silverMinus===""&&silverPhysical==="";
    const body={};
    if(!gBlank){ if(goldPhysical!=="") body.goldPhysicalRate=Number(goldPhysical); else body.goldDifference = goldPlus!=="" ? Number(goldPlus) : -Number(goldMinus); }
    if(!sBlank){ if(silverPhysical!=="") body.silverPhysicalRate=Number(silverPhysical); else body.silverDifference = silverPlus!=="" ? Number(silverPlus) : -Number(silverMinus); }
    if(Object.keys(body).length===0){
      setMdrUnlocked(false); setPassword(""); setShowPasswordBox(false);
      openPage("live");
      return;
    }
    try{
      const jwt=adminJwt || localStorage.getItem("rk_admin_jwt") || await adminLogin(password,"settings-update");
      const r=await fetch(`${API_BASE}/api/rate-difference`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${jwt}`},body:JSON.stringify(body)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.message||r.status);
      applyRateData(d);
      setGoldPlus(""); setGoldMinus(""); setGoldPhysical(""); setSilverPlus(""); setSilverMinus(""); setSilverPhysical("");
      setMdrUnlocked(false); setPassword(""); setShowPasswordBox(false);
      openPage("live");
      showMsg("Metal rate difference updated online for all devices");
      fetchRates();
    }catch(e){
      openPage("live");
      showMsg("Failed to update MDR. Please check backend server.");
      console.error(e);
    }
  }

  async function adminLogin(passwordValue, purpose="admin"){
    const r=await fetch(`${API_BASE}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:passwordValue,purpose})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok || !d.token) throw new Error(d.message||"Wrong Password");
    setAdminJwt(d.token);
    try{ localStorage.setItem("rk_admin_jwt", d.token); }catch{}
    setMarket(m=>({...m, jwtEnabled:true, adminSession:true, authVerified:true}));
    return d.token;
  }

  async function atuAccessOk(){ try{ await adminLogin(atuPassword,"atu-access"); setAtuUnlocked(true); setAtuMode("main"); setAtuPassword(""); setAtuToken(""); setAtuEditable(false); } catch(e){ setAtuPassword(""); showMsg("Wrong Password"); }}
  async function atuEnableUpdate(){ try{ await adminLogin(atuPassword,"token-update"); setAtuMode("main"); setAtuPassword(""); setAtuEditable(true); setAtuToken(""); } catch(e){ setAtuPassword(""); showMsg("Wrong Password"); }}
  function atuStartUpdate(){ if(!atuToken.trim()){ resetAtuMainSecure(); return; } setAtuMode("confirmUpdatePassword"); setAtuPassword(""); }
  async function atuConfirmUpdate(){ try{ const jwt=await adminLogin(atuPassword,"token-update"); const r=await fetch(`${API_BASE}/api/upstox/manual-token`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${jwt}`},body:JSON.stringify({accessToken:atuToken.trim()})}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Access token update failed"); resetAtuMainSecure(); openPage("live"); showMsg("Access token updated successfully"); setTimeout(fetchRates,350); }catch(e){ console.error(e); const msg=String(e.message||"").includes("Wrong")?"Wrong Password":"Access token update failed. Check server and MongoDB settings."; setAtuPassword(""); resetAtuMainSecure(); openPage("live"); showMsg(msg); }}
  async function atuReconnectPasswordOk(){ try{ const jwt=await adminLogin(atuPassword,"upstox-reconnect"); const r=await fetch(`${API_BASE}/api/admin/upstox-login-url`,{method:"POST",headers:{Authorization:`Bearer ${jwt}`}}); const d=await r.json().catch(()=>({})); if(!r.ok || !d.loginUrl) throw new Error(d.message||"Reconnect failed"); setAtuPassword(""); setAtuMode("main"); setAtuEditable(false); setAtuToken(""); openPage("live"); showMsg("Reconnect to Upstox page opened. After completing login, live page will sync automatically."); window.open(d.loginUrl, "_blank"); }catch(e){ setAtuPassword(""); openPage("live"); showMsg(String(e.message||"").includes("Wrong")?"Wrong Password":"Reconnect to Upstox failed. Check server settings."); }}
  async function atuViewTokenPasswordOk(){ try{ const jwt=await adminLogin(atuPassword,"token-view"); setAtuPassword(""); const r=await fetch(`${API_BASE}/api/upstox/current-token`,{cache:"no-store",headers:{Authorization:`Bearer ${jwt}`}}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Unable to load current token"); setCurrentToken(d.accessToken||""); setCurrentTokenUpdatedAt(d.updatedAt||d.accessTokenUpdatedAt||d.accessTokenExpiresAt||null); setCurrentTokenGeneratedBy(d.generatedBy||d.tokenGeneratedBy||d.source||null); setAtuMode("viewTokenPage"); setAtuEditable(false); setAtuToken(""); }catch(e){ console.error(e); setAtuPassword(""); setAtuMode("main"); showMsg(String(e.message||"").includes("Wrong")?"Wrong Password":"Current token could not be loaded. Please check backend and token storage."); }}
  async function copyCurrentTokenAndClose(){ try{ if(currentToken && navigator?.clipboard?.writeText){ await navigator.clipboard.writeText(currentToken); } }catch(e){ console.error(e); } setCurrentToken(""); setCurrentTokenUpdatedAt(null); setCurrentTokenGeneratedBy(null); setAtuMode("main"); showMsg("Current token copied successfully"); }

  if(showSplash) return <div className="splashScreen"><div className="splashGlow"/><h1>R K JEWELLERS</h1></div>;
  return <main className="phone">{menuOpen&&<div className="overlay" onClick={()=>setMenuOpen(false)}/>}<aside className={`sideMenu ${menuOpen?"open":""}`} onClick={(e)=>e.stopPropagation()}><h2>R K JEWELLERS</h2><button onClick={()=>openPage("live")}>LIVE RATE</button><button onClick={()=>openPage("mdr")}>MDR</button><button onClick={()=>openPage("atu")}>ATU</button><button onClick={()=>openPage("bank")}>BANK DETAILS</button><button onClick={()=>openPage("contact")}>CONTACT US</button></aside><header className="header"><button className="iconButton" onClick={()=>setMenuOpen(true)}>☰</button><div className="titleBox"><div className="crown">♛</div><h1>R K JEWELLERS</h1></div><div style={{width:34,height:34}}/></header>{page==="live"&&<LiveRatePage market={rawMarket} rates={rates} highs={highs} lows={lows} lastUpdated={lastUpdated}/>} {page==="mdr"&&<MdrPage unlocked={mdrUnlocked} showPasswordBox={showPasswordBox} showAccessPassword={()=>{setPassword("");setShowPasswordBox(true);}} password={password} setPassword={setPassword} unlockMdr={unlockMdr} goldPlus={goldPlus} goldMinus={goldMinus} silverPlus={silverPlus} silverMinus={silverMinus} setGoldPlus={changeBox(setGoldPlus,goldMinus!==""||goldPhysical!=="")} setGoldMinus={changeBox(setGoldMinus,goldPlus!==""||goldPhysical!=="")} goldPhysical={goldPhysical} setGoldPhysical={physicalBox(setGoldPhysical,goldPlus!==""||goldMinus!=="")} setSilverPlus={changeBox(setSilverPlus,silverMinus!==""||silverPhysical!=="")} setSilverMinus={changeBox(setSilverMinus,silverPlus!==""||silverPhysical!=="")} silverPhysical={silverPhysical} setSilverPhysical={physicalBox(setSilverPhysical,silverPlus!==""||silverMinus!=="")} updateMdrAndLock={updateMdrAndLock} serverStatus={serverStatus} goldDifference={goldDifference} silverDifference={silverDifference} goldDifferenceUpdatedAt={goldDifferenceUpdatedAt} silverDifferenceUpdatedAt={silverDifferenceUpdatedAt} goldDifferenceMcxAtUpdate={goldDifferenceMcxAtUpdate} silverDifferenceMcxAtUpdate={silverDifferenceMcxAtUpdate}/>} {page==="atu"&&<AtuPage mode={atuMode} setMode={setAtuMode} password={atuPassword} setPassword={setAtuPassword} token={atuToken} setToken={setAtuToken} editable={atuEditable} setEditable={setAtuEditable} accessOk={atuAccessOk} enableUpdate={atuEnableUpdate} startUpdate={atuStartUpdate} confirmUpdate={atuConfirmUpdate} reconnectOk={atuReconnectPasswordOk} viewTokenOk={atuViewTokenPasswordOk} currentToken={currentToken} currentTokenUpdatedAt={currentTokenUpdatedAt} currentTokenGeneratedBy={currentTokenGeneratedBy} copyCurrentTokenAndClose={copyCurrentTokenAndClose} tokenExpiresAt={tokenExpiresAt} tokenRemaining={tokenRemaining} tokenNeedsReconnect={market.tokenNeedsReconnect} mongoConnected={market.mongoConnected} mongoWarning={market.mongoWarning} tokenStorage={market.tokenStorage}/>} {page==="bank"&&<BankDetailsPage/>} {page==="contact"&&<ContactPage/>}{page==="live"&&market.showingLastRecordedData&&<div className="lastRecordedWarning fixedLastRecordedWarning">LAST RECORDED DATA IS SHOWING BECAUSE TOKEN GOT EXPIRED OR INVALID</div>}<BottomNav page={page} openPage={openPage}/><BottomMarquee/>{backArmed&&<div className="backHint">Press back again to exit</div>}{showExitConfirm&&<ExitConfirm onYes={()=>CapacitorApp.exitApp()} onNo={()=>setShowExitConfirm(false)}/>} {modal&&<CenterModal message={modal.message} onOk={closeModal}/>}</main>;
}

function LiveRatePage({market,rates,highs,lows,lastUpdated}){ const goldRef=market.goldComparisonClose || (market.marketClosed ? (market.goldThirdLastClose||market.goldPrevClose) : market.goldPrevClose); const silverRef=market.silverComparisonClose || (market.marketClosed ? (market.silverThirdLastClose||market.silverPrevClose) : market.silverPrevClose); const gCls=classByReference(market.goldMcx,goldRef), sCls=classByReference(market.silverMcx,silverRef); return <><section className="topCards"><McxCard metal="gold" title="GOLD MCX" sub="(10 GRAM)" price={market.goldMcx} cls={gCls} pct={pctText(market.goldMcx,goldRef)} diff={diffText(market.goldMcx,goldRef)} high={market.goldHigh} low={market.goldLow}/><McxCard metal="silver" title="SILVER MCX" sub="(1 KG)" price={market.silverMcx} cls={sCls} pct={pctText(market.silverMcx,silverRef)} diff={diffText(market.silverMcx,silverRef)} high={market.silverHigh} low={market.silverLow}/></section>{market.marketClosed&&<div className="marketClosedBadge">MARKET CLOSED</div>}<div className="timePill">◷ Last Updated: {formatDateTime(market.showingLastRecordedData ? market.lastRecordedRatesUpdatedAt : lastUpdated)}</div><section className="section goldSection"><div className="sectionHead"><MetalBars metal="gold" small/><h3>GOLD RATE</h3></div><RateRow rateCls={gCls} title="24K" purity="99.9%" value={rates.gold24} high={highs.gold24} low={lows.gold24}/><RateRow rateCls={gCls} title="22K" purity="91.6%" value={rates.gold22} high={highs.gold22} low={lows.gold22}/><RateRow rateCls={gCls} title="20K" purity="83.34%" value={rates.gold20} high={highs.gold20} low={lows.gold20}/><RateRow rateCls={gCls} title="18K" purity="75.0%" value={rates.gold18} high={highs.gold18} low={lows.gold18}/><RateRow rateCls={gCls} title="14K" purity="58.34%" value={rates.gold14} high={highs.gold14} low={lows.gold14}/></section><section className="section silverSection"><div className="sectionHead"><MetalBars metal="silver" small/><h3>SILVER RATE</h3></div><SilverRow rateCls={sCls} title="SILVER RATE" purity="1 KG" value={rates.silver1Kg} high={highs.silver1Kg} low={lows.silver1Kg}/><SilverRow rateCls={sCls} title="SILVER RATE" purity="10 GRAM" value={rates.silver10Gram} high={highs.silver10Gram} low={lows.silver10Gram}/></section></>; }
function McxCard({metal,title,sub,price,cls,pct,diff,high,low}){ return <div className={`mcxCard ${metal}Card`}><MetalBars metal={metal}/><h2>{title}</h2><p>{sub}</p><div className={`readonlyRate ${cls}`}>{formatINR(price)} <span className="pctMove">{arrow(cls)} {pct}</span><span className="mcxDiff">{diff}</span></div><div className="highLowLine"><span className="highText">HIGH {formatINR(high)}</span><span className="lowText">LOW {formatINR(low)}</span></div></div>; }
function MdrPage({unlocked,showPasswordBox,showAccessPassword,password,setPassword,unlockMdr,goldPlus,goldMinus,goldPhysical,setGoldPlus,setGoldMinus,setGoldPhysical,silverPlus,silverMinus,silverPhysical,setSilverPlus,setSilverMinus,setSilverPhysical,updateMdrAndLock,serverStatus,goldDifference,silverDifference,goldDifferenceUpdatedAt,silverDifferenceUpdatedAt,goldDifferenceMcxAtUpdate,silverDifferenceMcxAtUpdate}){ if(!unlocked){ return <section className="adminPage">{showPasswordBox?<div className="accessBox"><input type="password" placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={unlockMdr}>ACCESS</button></div>:<><div className="adminLock"><h2>Only access to administration</h2><p>This page is protected.</p></div><div className="accessBox"><button onClick={showAccessPassword}>ACCESS</button></div></>}</section>; } const goldLocked=goldPlus!==""||goldMinus!==""||goldPhysical!==""; const silverLocked=silverPlus!==""||silverMinus!==""||silverPhysical!==""; return <section className="section differenceSection mdrOpen"><div className={`serverBadge ${serverStatus==="Online"?"online":"offline"}`}>Server: {serverStatus}</div><h3>⚖ METAL RATE DIFFERENCE</h3><p className="helpText">All six tabs open blank. Fill only one gold tab and only one silver tab. Clear the filled tab to edit the other tabs.</p><div className="editBox"><label>GOLD RATE DIFFERENCE</label><div className="plusMinusGrid threeGrid"><input type="text" inputMode="numeric" placeholder="PLUS +" value={goldPlus} disabled={goldLocked&&goldPlus===""} onChange={e=>setGoldPlus(e.target.value)}/><input type="text" inputMode="numeric" placeholder="MINUS -" value={goldMinus} disabled={goldLocked&&goldMinus===""} onChange={e=>setGoldMinus(e.target.value)}/><input type="text" inputMode="decimal" placeholder="PHYSICAL GOLD 99.30 / 99.50" value={goldPhysical} disabled={goldLocked&&goldPhysical===""} onChange={e=>setGoldPhysical(e.target.value)}/></div><div className="physicalRateHeader"><div><b>Physical gold rate</b><small>(99.30 / 99.50)</small></div><div><b>Physical silver rate</b><small>(990 / 995)</small></div></div><label>SILVER RATE DIFFERENCE</label><div className="plusMinusGrid threeGrid"><input type="text" inputMode="numeric" placeholder="PLUS +" value={silverPlus} disabled={silverLocked&&silverPlus===""} onChange={e=>setSilverPlus(e.target.value)}/><input type="text" inputMode="numeric" placeholder="MINUS -" value={silverMinus} disabled={silverLocked&&silverMinus===""} onChange={e=>setSilverMinus(e.target.value)}/><input type="text" inputMode="decimal" placeholder="PHYSICAL SILVER 990 / 995" value={silverPhysical} disabled={silverLocked&&silverPhysical===""} onChange={e=>setSilverPhysical(e.target.value)}/></div><button onClick={updateMdrAndLock}>UPDATE & LOCK</button><div className="differenceSummary"><div><b>gold rate difference = {toNum(goldDifference)}</b><small>{formatDateTime(goldDifferenceUpdatedAt)}</small><small>Gold MCX at update: {goldDifferenceMcxAtUpdate?formatINR(goldDifferenceMcxAtUpdate):"Not available"}</small></div><div><b>silver rate difference = {toNum(silverDifference)}</b><small>{formatDateTime(silverDifferenceUpdatedAt)}</small><small>Silver MCX at update: {silverDifferenceMcxAtUpdate?formatINR(silverDifferenceMcxAtUpdate):"Not available"}</small></div></div></div></section>; }
function AtuPage({mode,setMode,password,setPassword,token,setToken,editable,setEditable,accessOk,enableUpdate,startUpdate,confirmUpdate,reconnectOk,viewTokenOk,currentToken,currentTokenUpdatedAt,currentTokenGeneratedBy,copyCurrentTokenAndClose,tokenExpiresAt,tokenRemaining,tokenNeedsReconnect,mongoConnected,mongoWarning,tokenStorage}){
  if(mode==="locked") return <section className="adminPage atuPage atuLockPage"><div className="adminLock atuLockTop"><h2>ONLY ACCESS TO ADMINISTRATION</h2><p>This page is protected</p></div><div className="atuLockBottom"><div className="accessBox"><button onClick={()=>{setPassword("");setMode("accessPassword");}}>Access</button></div><TokenTimer compact tokenExpiresAt={tokenExpiresAt} tokenRemaining={tokenRemaining} tokenNeedsReconnect={tokenNeedsReconnect} mongoConnected={mongoConnected} mongoWarning={mongoWarning} tokenStorage={tokenStorage}/></div></section>;
  if(mode==="accessPassword") return <PasswordPanel title="Password" button="Access" password={password} setPassword={setPassword} onSubmit={accessOk}/>;
  if(mode==="enableUpdatePassword") return <PasswordPanel title="Password" button="Update Access Token" password={password} setPassword={setPassword} onSubmit={enableUpdate}/>;
  if(mode==="confirmUpdatePassword") return <PasswordPanel title="Password" button="Update" password={password} setPassword={setPassword} onSubmit={confirmUpdate}/>;
  if(mode==="reconnectPassword") return <PasswordPanel title="Password" button="Reconnect to Upstox" password={password} setPassword={setPassword} onSubmit={reconnectOk}/>;
  if(mode==="viewTokenPassword") return <PasswordPanel title="Password" button="view token" password={password} setPassword={setPassword} onSubmit={viewTokenOk}/>;
  if(mode==="viewTokenPage") return <section className="section infoSection atuPage"><h3>View Token</h3><label className="fieldLabel">Current Token</label><textarea className="tokenArea currentTokenArea" value={currentToken||""} readOnly placeholder="No current token found"/><div className="tokenUpdatedLine"><b>Last Token Updated</b><span>{formatDateTime(currentTokenUpdatedAt)}</span></div><div className="tokenUpdatedLine"><b>Last Token Generated By</b><span>{formatTokenMethod(currentTokenGeneratedBy)}</span></div><button className="wideBtn" onClick={copyCurrentTokenAndClose}>Save and Copy</button></section>;
  return <section className="section infoSection atuPage"><h3>Admin Token Update</h3><label className="fieldLabel">Access Token</label><textarea className="tokenArea" value={token} placeholder="Access token field opens blank for security" disabled={!editable} onChange={e=>setToken(e.target.value)} />{!editable?<button className="wideBtn" onClick={()=>{setPassword("");setMode("enableUpdatePassword");}}>Update Access Token</button>:<button className="wideBtn" onClick={startUpdate}>Update</button>}<div style={{height:14}}/><button className="wideBtn secondary" onClick={()=>{setPassword("");setMode("viewTokenPassword");}}>View Token</button><button className="wideBtn reconnectBtn" onClick={()=>{setPassword("");setMode("reconnectPassword");}}>Reconnect to Upstox</button><TokenTimer tokenExpiresAt={tokenExpiresAt} tokenRemaining={tokenRemaining} tokenNeedsReconnect={tokenNeedsReconnect} mongoConnected={mongoConnected} mongoWarning={mongoWarning} tokenStorage={tokenStorage}/></section>;
}
function PasswordPanel({title,button,password,setPassword,onSubmit}){ return <section className="adminPage"><div className="accessBox"><h2>{title}</h2><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={onSubmit}>{button}</button></div></section>; }
function TokenTimer({tokenExpiresAt, tokenRemaining, tokenNeedsReconnect, mongoConnected, mongoWarning, tokenStorage, compact=false}){
  const expiredText = tokenNeedsReconnect || String(tokenExpiresAt||tokenRemaining||"").toUpperCase().includes("TOKEN EXPIRED") || String(tokenRemaining||"").toUpperCase().includes("NOT WORKING") || String(tokenRemaining||"").toUpperCase().includes("INVALID");
  return <div className={`tokenTimer ${expiredText?"bad":""}`}>
    {expiredText ? (
      <p className="tokenExpiredText"><b>TOKEN EXPIRED OR INVALID</b></p>
    ) : (
      <>
        {!compact&&<><p><b>Token Valid Till</b></p><p>{formatDateTime(tokenExpiresAt)}</p></>}
        <p><b>Remaining:</b> {tokenRemaining}</p>
      </>
    )}
    {mongoConnected===false&&<p className="mongoWarn">{mongoWarning||(tokenStorage==="render-env-backup"?"mangodb gets disconnected and using token value by render":"mangodb gets disconnected and token is not updated on render")}</p>}
  </div>;
}
function MetalBars({metal,small=false}){ return <div className={`metalBars ${metal} ${small?"small":""}`}><span/><span/><span/><span/><span/></div>; }
function BankDetailsPage(){ return <section className="section infoSection bankPage"><h3>🏦 BANK DETAILS</h3><InfoRow label="BANK NAME" value="SBI 🏦"/><InfoRow label="ACCOUNT NAME" value="R K JEWELLERS"/><InfoRow label="ACCOUNT NO." value="35705273231"/><InfoRow label="IFSC CODE" value="SBIN0003310"/><InfoRow label="BRANCH NAME" value="DARAGANJ, PRAYAGRAJ"/></section>; }
function ContactPage(){ return <section className="section infoSection"><h3>📍 CONTACT US</h3><div className="addressBox"><h4>ADDRESS</h4><p>774 DARAGANJ PRAYAGRAJ - 211006 UTTAR PRADESH, INDIA</p></div><div className="addressBox"><h4>CONTACT NUMBER</h4><p>🟢 WhatsApp No :- 9450592584</p><p>Mobile No :- 9335103379</p></div></section>; }
function BottomNav({page,openPage}){ return <nav className="bottomNav"><button className={page==="live"?"active":""} onClick={()=>openPage("live")}>LIVE RATE</button><button className={page==="bank"?"active":""} onClick={()=>openPage("bank")}>BANK DETAILS</button><button className={page==="contact"?"active":""} onClick={()=>openPage("contact")}>CONTACT US</button></nav>; }
function BottomMarquee(){ return <div className="bottomMarquee"><span>Shop will be closed on Tuesday</span></div>; }
function InfoRow({label,value}){ return <div className="infoRow"><strong>{label}</strong><span>:-</span><p>{value}</p></div>; }
function RateRow({title,purity,value,high,low,rateCls="neutral"}){ return <div className="rateRow"><div><strong>{title}</strong><span>({purity})</span></div><span>=</span><div className={`rateValue ${rateCls}`}><strong>{formatINR(value)}</strong><small><b className="highText">HIGH {formatINR(high)}</b><b className="lowText">LOW {formatINR(low)}</b></small></div></div>; }
function SilverRow(props){ return <RateRow {...props}/>; }
function ExitConfirm({onYes,onNo}){ return <div className="exitOverlay"><div className="exitBox"><h3>are you sure you want to exit an app</h3><div><button onClick={onYes}>YES</button><button onClick={onNo}>NO</button></div></div></div>; }
function CenterModal({message,onOk}){ return <div className="exitOverlay"><div className="exitBox"><h3>{message}</h3><div className="modalActions oneButton"><button onClick={onOk}>OK</button></div></div></div>; }
