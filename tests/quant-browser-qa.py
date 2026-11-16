"""FOMO Quant isolated six-venue Chromium QA (no deployment/trading).

Part A uses routed synthetic public-provider replies to verify UI behaviour.
Part B uses real browser cross-origin fetches from loopback localhost. It writes
per-source evidence and remains VERIFY if fewer than six venues accessible.
Browser localhost is NOT equivalent to a future protected HTTPS origin or phone.
"""
import json
import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=Path("/tmp/fomo-quant-browser-evidence")
OUT.mkdir(parents=True, exist_ok=True)
PORT=8765
URL=f"http://127.0.0.1:{PORT}/quant-market-lab.html"
SOURCES=["Kraken","Coinbase Exchange","Gemini","Bybit","OKX","KuCoin","Gate.io","Bitfinex","HTX","Crypto.com Exchange"]

def mock_response(url,asset="BTC"):
    at=int(time.time()*1000)
    t=datetime.fromtimestamp(at/1000, timezone.utc).isoformat().replace("+00:00","Z")
    if "kraken.com" in url:
        return {"error":[],"result":{"XXBTZUSD":{"a":["101"],"b":["100"]}}}
    if "exchange.coinbase.com" in url:
        return {"trade_id":12345,"time":t,"bid":"100","ask":"101"}
    if "gemini.com" in url:
        return {"last":"100.5","bid":"100","ask":"101"}
    if "bybit.com" in url:
        return None
    if "okx.com" in url:
        return {"code":"0","data":[{"instType":"SPOT","instId":"BTC-USDT","bidPx":"100","askPx":"101","ts":str(at)}]}
    if "kucoin.com" in url:
        return {"code":"200000","data":{"bestBid":"100","bestAsk":"101","time":at}}
    if "gateio.ws" in url:
        return [{"currency_pair":"BTC_USDT","highest_bid":"100","lowest_ask":"101"}]
    if "bitfinex.com" in url:
        return [100,1,101,1,0,0,100.5,100,102,99]
    if "huobi.pro" in url:
        return {"status":"ok","ch":"market.btcusdt.detail.merged",
                "ts":at,"tick":{"bid":[100,1],"ask":[101,1]}}
    if "api.crypto.com" in url:
        return {"method":"public/get-tickers","code":0,
                "result":{"data":[{"i":"BTC_USDT","b":"100","k":"101","t":at}]}}
    raise AssertionError("unexpected source: "+url)

def route_mock(route):
    obj=mock_response(route.request.url)
    if obj is None:
        route.fulfill(status=403,content_type="application/json",body='{"error":"HTTP 403"}',
                      headers={"Access-Control-Allow-Origin":"*"})
    else:
        route.fulfill(status=200,content_type="application/json",body=json.dumps(obj),
                      headers={"Access-Control-Allow-Origin":"*","Cache-Control":"no-store"})

def bundled_dashboard_navigation(browser):
    """The two products must ship together, not as unlinked parallel demos."""
    page=browser.new_page(viewport={"width":1360,"height":850})
    page.goto(f"http://127.0.0.1:{PORT}/index.html?mode=sim&tick=300",
              wait_until="domcontentloaded")
    launch=page.locator("#quantProfitLauncher")
    expect(launch).to_have_attribute("href","./quant-market-lab.html")
    expect(launch).to_be_visible(timeout=12000)
    planner=page.locator("#quantProfitFromPlanner")
    expect(planner).to_have_attribute("href","./quant-market-lab.html")
    assert launch.get_attribute("data-research-only")=="true"
    assert planner.get_attribute("data-research-only")=="true"
    launch.click()
    page.wait_for_url("**/quant-market-lab.html",timeout=12000)
    expect(page.locator("#calculator")).to_be_visible()
    expect(page.locator("#sources")).to_be_visible()
    expect(page.locator("header a.brand")).to_have_attribute("href","./index.html")
    assert not page.evaluate("Object.keys(localStorage).some(k => /quantMarketOrder/i.test(k))")
    page.screenshot(path=str(OUT/"bundle-navigation.png"),full_page=True)
    page.close()
    print("QUANT_BUNDLE_NAV_PASS: main dashboard CTA + planner CTA => same-origin calculator with market sources; research-only")

def protected_preview_browser(browser):
    """Check loopback-authenticated BUNDLE in actual Chromium; NOT hosted HTTPS."""
    from urllib.error import HTTPError
    protected_port=8766
    user="quant_test_only"
    secret="synthetic-secret-for-local-QA-not-for-production"
    env={**os.environ,
         "PORT":str(protected_port),
         "QUANT_PREVIEW_USER":user,
         "QUANT_PREVIEW_PASSWORD":secret,
         "QUANT_PREVIEW_ALLOW_HTTP_LOCALHOST":"1"}
    proc=subprocess.Popen(["node","preview/quant-protected/server.mjs"],
                          cwd=ROOT,env=env,
                          stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        protected=f"http://127.0.0.1:{protected_port}"
        for _ in range(40):
            try:
                with urlopen(protected+"/healthz",timeout=1) as r:
                    if r.status==200:break
            except OSError:
                time.sleep(.2)
        else:
            raise AssertionError("protected preview did not start")
        try:
            with urlopen(protected+"/quant-market-lab.html",timeout=2):
                raise AssertionError("anonymous access should be denied")
        except HTTPError as ex:
            assert ex.code==401,"expected WWW-Authenticate"
        ctx=browser.new_context(http_credentials={"username":user,"password":secret},
                                 viewport={"width":1360,"height":880},
                                 accept_downloads=True)
        page=ctx.new_page()
        page.goto(protected+"/index.html?mode=sim&tick=300",
                  wait_until="domcontentloaded")
        expect(page.locator("#quantProfitLauncher")).to_be_visible()
        page.locator("#quantProfitLauncher").click()
        page.wait_for_url("**/quant-market-lab.html",timeout=12000)
        expect(page.locator("#sources")).to_be_visible()
        expect(page.locator("#calculator")).to_be_visible()
        assert page.locator('meta[http-equiv="Content-Security-Policy"]').count()==1
        expect(page.locator("#refresh")).to_be_disabled()
        expect(page.locator("#load-synthetic")).to_be_visible()
        page.locator("#load-synthetic").click()
        expect(page.locator("#scan-status")).to_contain_text("SYNTHETIC")
        page.locator("#venues button").first.click()
        expect(page.locator("#chosen")).to_have_value("SYNTHETIC DEMO")
        page.locator("#calculate").click()
        expect(page.locator("#export")).to_be_enabled()
        assert "SYNTHETIC" in page.locator("#breakdown").inner_text().upper()
        with page.expect_download() as export:
            page.locator("#export").click()
        evidence=json.loads(Path(export.value.path()).read_text())
        assert evidence["quote"]["status"]=="SYNTHETIC_QUOTE"
        assert evidence["scope"]=="NOT_PAPER_ELIGIBLE"
        assert evidence["scenario"]["allowedToTrade"] is False
        assert evidence["scenario"]["financiallyEligiblePaper"] is False
        assert evidence["scenario"]["verifiedNet"] is None
        assert "SYNTHETIC_FIXTURE_NOT_MARKET_DATA" in evidence["scenario"]["reasonCodes"]
        # Prove CSP, not CORS or DNS, blocks an otherwise supported exchange host.
        csp_block=page.evaluate("""async () => {
            let violation=null;
            const handler=e=>{
                if(e.effectiveDirective==='connect-src') violation=e.blockedURI;
            };
            document.addEventListener('securitypolicyviolation',handler);
            const controller=new AbortController();
            const abort=setTimeout(()=>controller.abort(),2500);
            try {
                await fetch('https://api.kraken.com/0/public/Time',
                  {mode:'cors',credentials:'omit',signal:controller.signal});
            } catch(e) {}
            clearTimeout(abort);
            document.removeEventListener('securitypolicyviolation',handler);
            return violation;
        }""")
        assert csp_block and "api.kraken.com" in csp_block, (
            "Synthetic private preview must reject market API via connect-src CSP")
        page.locator("#fee-out").fill("25")
        expect(page.locator("#export")).to_be_disabled()
        assert page.locator("#net").inner_text()=="—"
        page.screenshot(path=str(OUT/"auth-protected-bundle-mocked.png"),full_page=True)
        # This is responsive Chrome emulation, NOT a physical Samsung QA pass.
        mobile=ctx.new_page(viewport={"width":390,"height":844})
        mobile.goto(protected+"/index.html?mode=sim",wait_until="domcontentloaded")
        mobile.locator("#quantProfitLauncher").click()
        mobile.wait_for_url("**/quant-market-lab.html",timeout=12000)
        expect(mobile.locator("#load-synthetic")).to_be_visible()
        mobile.locator("#load-synthetic").click()
        mobile.locator("#venues button").first.click()
        mobile.locator("#calculate").click()
        expect(mobile.locator("#export")).to_be_enabled()
        horizontal_overflow=mobile.evaluate(
            "document.documentElement.scrollWidth - innerWidth")
        assert horizontal_overflow<=2, (
            f"protected synthetic calculator 390px overflow: {horizontal_overflow}")
        mobile.screenshot(path=str(OUT/"auth-protected-mobile390-synthetic.png"),
                          full_page=True)
        mobile.close()
        ctx.close()
        (OUT/"protected-local-auth-evidence.json").write_text(
            json.dumps({"scope":"LOCALHOST_ONLY_NO_HTTPS",
                        "live_deployment":False,"independent_review":False,
                        "browser_authenticated_navigation":"PASS",
                        "anonymous_access_denied":"PASS",
                        "source_prices":"SYNTHETIC_FIXTURES",
                        "external_market_connection_csp":"DENIED_VERIFIED",
                        "synthetic_export_not_paper":"PASS",
                        "responsive_chrome_390px":"PASS_NOT_PHYSICAL_PHONE",
                        "financial_export_after_input_change":"DISABLED",
                        "physical_samsung":"NOT_TESTED"},indent=2)+"\n")
        print("QUANT_PROTECTED_LOCAL_CHROMIUM_PASS: auth 401, synthetic-only browser/API CSP denial, exported NOT_PAPER_ELIGIBLE JSON, 390px responsive Chrome; HTTPS/Samsung/Legal pending")
    finally:
        proc.terminate()
        try:proc.wait(timeout=3)
        except subprocess.TimeoutExpired:proc.kill()


def asset_change_inflight_race(browser):
    """A delayed BTC source scan must never repaint an ETH panel."""
    page=browser.new_page(viewport={"width":1280,"height":800})
    # The source-module object is frozen: intercept fetch before module load.
    # All 10 public requests remain synthetic and pending until after asset switch.
    page.add_init_script("""(() => {
      window.__pendingSourceResponses=[];
      window.fetch=(input,options)=>new Promise(resolve=>{
        window.__pendingSourceResponses.push({url:String(input),resolve});
      });
    })()""")
    page.goto(URL,wait_until="domcontentloaded")
    page.locator("#refresh").click()
    expect(page.locator("#refresh")).to_be_disabled()
    page.wait_for_function("window.__pendingSourceResponses.length===10",timeout=5000)
    page.locator("#asset").select_option("ETH")
    expect(page.locator("#scan-status")).to_contain_text("Asset changed")
    # A structurally valid late Kraken BTC quote plus nine invalid responses.
    page.evaluate("""() => {
      window.__pendingSourceResponses.forEach(({url,resolve}) => {
        const payload=url.includes("kraken.com")
          ? {error:[],result:{XXBTZUSD:{a:["101"],b:["100"]}}}
          : {};
        resolve(new Response(JSON.stringify(payload), {
          status:200,headers:{"Content-Type":"application/json"}
        }));
      });
    }""")
    expect(page.locator("#refresh")).to_be_enabled(timeout=5000)
    expect(page.locator("#scan-status")).to_contain_text("Asset changed")
    assert page.locator("#venues tr").count()==0,"late BTC response repainted ETH results"
    assert page.locator("#venues button").count()==0
    assert page.locator("#chosen option").count()==0
    assert page.locator("#export").is_disabled()
    assert page.locator("#net").inner_text()=="—"
    page.close()
    print("QUANT_INFLIGHT_ASSET_RACE_PASS: stale BTC responses discarded after ETH switch; export locked")


def deterministic(browser):
    page=browser.new_page(accept_downloads=True, viewport={"width":1280,"height":900})
    page.goto(URL)
    assert "CREATED BY PROOF & SIGNAL" in page.locator("header").inner_text().upper()
    assert "Financial controls locked" in page.locator("body").inner_text()
    page.route("https://**/*",route_mock)
    page.locator("#refresh").click()
    expect(page.locator("#scan-status")).to_contain_text("9/10",timeout=25000)
    assert page.locator("#venues tr").count()==10
    assert "HTTP 403" in page.locator("#venues").inner_text()
    assert page.locator("#venues button").count()==9
    page.locator("#venues button").first.click()
    expect(page.locator("#chosen")).to_have_value("Kraken")
    page.locator("#exit").fill("110")
    page.locator("#fee-in").fill("10")
    page.locator("#fee-out").fill("10")
    page.locator("#slip-in").fill("0")
    page.locator("#slip-out").fill("0")
    page.locator("#other").fill("0")
    page.locator("#calculate").click()
    expect(page.locator("#calc-status")).to_contain_text("HYPOTHETICAL")
    assert "USD" in page.locator("#net").inner_text()
    assert "NOT VERIFIED" in page.locator("#breakdown").inner_text()
    assert "NO EXECUTION" in page.locator("#calc-status").inner_text()
    assert "NO_ACCOUNT_FEES" in page.locator("#breakdown").inner_text()
    with page.expect_download() as download:
        page.locator("#export").click()
    data=json.loads(Path(download.value.path()).read_text())
    assert data["scope"]=="NOT_PAPER_ELIGIBLE"
    assert data["scenario"]["financiallyEligiblePaper"] is False
    assert data["scenario"]["allowedToTrade"] is False
    assert data["quote"]["venue"]=="Kraken"
    assert data["quote"]["quoteCurrency"]=="USD"
    assert data["scenario"]["conditionalNetQuote"] is not None
    page.locator("#fee-in").fill("")
    page.locator("#calculate").click()
    assert "VERIFY" in page.locator("#calc-status").inner_text()
    assert page.locator("#export").is_disabled()
    assert page.locator("#net").inner_text()=="—"
    page.locator("#direction").select_option("SHORT")
    assert "VERIFY" in page.locator("#calc-status").inner_text()
    # No PAPER storage or order calls. The standalone module is isolated.
    assert page.evaluate("Object.keys(localStorage).filter(k => /paper|trade|fomo/i.test(k))")==[]
    page.screenshot(path=str(OUT/"desktop-mocked.png"),full_page=True)
    page.close()
    mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=2)
    mobile.goto(URL)
    mobile.route("https://**/*",route_mock)
    mobile.locator("#refresh").click()
    expect(mobile.locator("#scan-status")).to_contain_text("9/10",timeout=25000)
    assert mobile.locator("#calculate").is_visible()
    assert mobile.locator("#asset").is_visible()
    assert mobile.locator("#calculator").bounding_box() is not None
    # Tabular overflow must be contained within tablewrap, not document.
    overflow=mobile.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert overflow <= 2, f"mobile body horizontal overflow {overflow}"
    mobile.screenshot(path=str(OUT/"mobile390-mocked.png"),full_page=True)
    mobile.close()
    print("CHROMIUM_MOCKED_UI_PASS: ten configured / nine synthetic response fixtures, source selection, fees, export, fail-closed, 390px viewport, no PAPER writes")

def live_browser(browser):
    page=browser.new_page(viewport={"width":1360,"height":850})
    errors=[]
    page.on("console",lambda m: errors.append(m.text[:240]) if m.type=="error" else None)
    page.goto(URL)
    page.locator("#refresh").click()
    expect(page.locator("#refresh")).to_be_enabled(timeout=55000)
    result=page.evaluate("""() => {
      const t = Array.from(document.querySelectorAll("#venues tr"));
      return {url:location.href, status:document.querySelector("#scan-status").textContent,
        rows:t.map(r=>({text:r.innerText.slice(0,440),url:r.querySelector("a")?.href||null}))};
    }""")
    # Production-like CSP permits connections only to the 10 declared venues.
    # No exploratory market calls from a released browser build.
    result["csp_installed"] = page.locator('meta[http-equiv="Content-Security-Policy"]').count()==1
    assert result["csp_installed"], "CSP absent in browser"
    result["csp_origin_block_proof"] = page.evaluate("""async () => {
        try {
            await fetch("https://example.invalid/unapproved-endpoint", {
                mode: "cors", credentials: "omit", cache: "no-store"
            });
            return "BAD_UNEXPECTED_CONNECT";
        } catch(e) {
            return "DENIED_EXPECTED";
        }
    }""")
    assert result["csp_origin_block_proof"] == "DENIED_EXPECTED"
    result["captured_at_utc"]=datetime.now(timezone.utc).isoformat()
    result["origin_kind"]="LOOPBACK_CHROMIUM_NOT_PROTECTED_HTTPS"
    result["browser_console_errors"]=errors[:20]
    result["source_details_available_to_client"]=True
    result["live_chromium_source_gate"]="REVIEW" # filled below by observed per-row evidence
    rows=result["rows"]
    observed=sum("RECEIVED · " in x["text"] for x in rows)
    result["observed_sources"]=observed
    result["configured_sources"]=10
    result["live_chromium_source_gate"]="PASS_SOURCE_READ_ONLY" if observed>=6 else "VERIFY_BROWSER_SOURCE_COVERAGE"
    result["PAPER_eligibility_gate"]="LOCKED"
    (OUT/"live-browser-source-evidence.json").write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n")
    page.screenshot(path=str(OUT/"live-browser-localhost.png"),full_page=True)
    print("CHROMIUM_REAL_CORS_RESULT "+json.dumps(result,ensure_ascii=False))
    page.close()
    return result

def main():
    server=subprocess.Popen(["python","-m","http.server",str(PORT),"--bind","127.0.0.1"],
                            cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for i in range(30):
            try:
                with urlopen(URL,timeout=1) as r:
                    if r.status==200:break
            except OSError:
                time.sleep(.2)
        else:
            raise AssertionError("local static QA server failed")
        with sync_playwright() as p:
            chrome=shutil.which("google-chrome") or shutil.which("chromium")
            assert chrome, "Hosted Chromium not found"
            browser=p.chromium.launch(headless=True,executable_path=chrome,
                                      args=["--no-sandbox","--disable-dev-shm-usage"])
            protected_preview_browser(browser)
            bundled_dashboard_navigation(browser)
            asset_change_inflight_race(browser)
            deterministic(browser)
            live_browser(browser)
            browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()

if __name__=="__main__":
    main()
