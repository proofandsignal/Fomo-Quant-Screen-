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
        # The private first screen must be the Premium English client experience,
        # not the legacy technical console. Exercise the actual protected-origin
        # CSP and interactive state, rather than only checking HTML content.
        premium=ctx.new_page()
        premium.goto(protected+"/",wait_until="domcontentloaded")
        assert premium.locator("html").get_attribute("lang")=="en"
        expect(premium.locator("#explore-cta")).to_be_visible()
        premium.locator("#explore-cta").click()
        premium.locator('[data-scenario="concentration"]').click()
        expect(premium.locator("#decision")).to_have_text("REVIEW")
        assert "SYNTHETIC" in premium.locator("body").inner_text().upper()
        assert premium.locator("meta[http-equiv='Content-Security-Policy']").count()==1
        premium.screenshot(path=str(OUT/"protected-premium-desktop-auth.png"),full_page=True)
        premium.close()
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
            return await new Promise(async resolve => {
                const handler=e=>{
                    if(e.effectiveDirective==='connect-src' &&
                       e.blockedURI.includes('api.kraken.com')){
                        clearTimeout(timeout);
                        document.removeEventListener('securitypolicyviolation',handler);
                        resolve(e.blockedURI);
                    }
                };
                const timeout=setTimeout(()=>{
                    document.removeEventListener('securitypolicyviolation',handler);
                    resolve(null);
                },2500);
                document.addEventListener('securitypolicyviolation',handler);
                const controller=new AbortController();
                const abort=setTimeout(()=>controller.abort(),2200);
                try {
                    await fetch('https://api.kraken.com/0/public/Time',
                      {mode:'cors',credentials:'omit',signal:controller.signal});
                } catch(e) {}
                clearTimeout(abort);
                // Keep listener alive for async browser CSP violation dispatch.
            });
        }""")
        assert csp_block and "api.kraken.com" in csp_block, (
            "Synthetic private preview must reject market API via connect-src CSP")
        page.locator("#fee-out").fill("25")
        expect(page.locator("#export")).to_be_disabled()
        assert page.locator("#net").inner_text()=="—"
        page.screenshot(path=str(OUT/"auth-protected-bundle-mocked.png"),full_page=True)
        # This is responsive Chrome emulation, NOT a physical Samsung QA pass.
        mobile=ctx.new_page()
        mobile.set_viewport_size({"width":390,"height":844})
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
        premiumMobile=ctx.new_page()
        premiumMobile.set_viewport_size({"width":390,"height":844})
        premiumMobile.goto(protected+"/",wait_until="domcontentloaded")
        expect(premiumMobile.locator("#explore-cta")).to_be_visible()
        premiumMobile.locator("#explore-cta").click()
        premiumMobile.locator('[data-scenario="chase"]').click()
        expect(premiumMobile.locator("#decision")).to_have_text("NO TRADE")
        assert premiumMobile.evaluate("document.documentElement.scrollWidth - innerWidth")<=2
        premiumMobile.screenshot(path=str(OUT/"protected-premium-mobile390-auth.png"),full_page=True)
        premiumMobile.close()
        ctx.close()
        (OUT/"protected-local-auth-evidence.json").write_text(
            json.dumps({"scope":"LOCALHOST_ONLY_NO_HTTPS",
                        "live_deployment":False,"independent_review":False,
                        "browser_authenticated_navigation":"PASS",
                        "protected_premium_root_desktop":"PASS",
                        "protected_premium_root_mobile390":"PASS_NOT_PHYSICAL_PHONE",
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
    """Public synthetic asset switch must invalidate previous quote and export."""
    page=browser.new_page(viewport={"width":1280,"height":800})
    page.goto(URL,wait_until="domcontentloaded")
    expect(page.locator("#refresh")).to_be_disabled()
    expect(page.locator("#load-synthetic")).to_be_visible()
    page.locator("#load-synthetic").click()
    expect(page.locator("#scan-status")).to_contain_text("SYNTHETIC")
    page.locator("#venues button").first.click()
    page.locator("#calculate").click()
    expect(page.locator("#export")).to_be_enabled()
    page.locator("#asset").select_option("ETH")
    expect(page.locator("#scan-status")).to_contain_text("Asset changed")
    assert page.locator("#venues tr").count()==0
    assert page.locator("#chosen option").count()==0
    expect(page.locator("#export")).to_be_disabled()
    assert page.locator("#net").inner_text()=="—"
    page.locator("#load-synthetic").click()
    assert "ETH/USD" in page.locator("#venues").inner_text()
    assert "BTC/USD" not in page.locator("#venues").inner_text()
    page.close()
    print("QUANT_SYNTHETIC_ASSET_ISOLATION_PASS: no BTC quote or export survives switching to ETH")

def deterministic(browser):
    """Public Pages static file journey — all market inputs synthetic, no quotes."""
    page=browser.new_page(accept_downloads=True,viewport={"width":1280,"height":900})
    page.goto(URL)
    assert "CREATED BY PROOF & SIGNAL" in page.locator("header").inner_text().upper()
    assert "Financial controls locked" in page.locator("body").inner_text()
    expect(page.locator("#refresh")).to_be_disabled()
    expect(page.locator("#load-synthetic")).to_be_visible()
    page.locator("#load-synthetic").click()
    expect(page.locator("#scan-status")).to_contain_text("SYNTHETIC")
    assert page.locator("#venues tr").count()==1
    assert "SYNTHETIC" in page.locator("#venues").inner_text()
    page.locator("#venues button").first.click()
    expect(page.locator("#chosen")).to_have_value("SYNTHETIC DEMO")
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
    with page.expect_download() as download:
        page.locator("#export").click()
    data=json.loads(Path(download.value.path()).read_text())
    assert data["scope"]=="NOT_PAPER_ELIGIBLE"
    assert data["quote"]["status"]=="SYNTHETIC_QUOTE"
    assert data["quote"]["venue"]=="SYNTHETIC DEMO"
    assert data["scenario"]["allowedToTrade"] is False
    assert data["scenario"]["financiallyEligiblePaper"] is False
    assert data["scenario"]["verifiedNet"] is None
    assert "SYNTHETIC_FIXTURE_NOT_MARKET_DATA" in data["scenario"]["reasonCodes"]
    page.locator("#fee-in").fill("")
    page.locator("#calculate").click()
    assert "VERIFY" in page.locator("#calc-status").inner_text()
    expect(page.locator("#export")).to_be_disabled()
    assert page.locator("#net").inner_text()=="—"
    page.locator("#direction").select_option("SHORT")
    assert "VERIFY" in page.locator("#calc-status").inner_text()
    assert page.evaluate("Object.keys(localStorage).filter(k => /paper|trade|fomo/i.test(k))")==[]
    page.screenshot(path=str(OUT/"public-synthetic-desktop.png"),full_page=True)
    page.close()
    mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=2)
    mobile.goto(URL)
    expect(mobile.locator("#refresh")).to_be_disabled()
    mobile.locator("#asset").select_option("SOL")
    mobile.locator("#load-synthetic").click()
    mobile.locator("#venues button").first.click()
    mobile.locator("#calculate").click()
    expect(mobile.locator("#export")).to_be_enabled()
    assert "SOL/USD" in mobile.locator("#venues").inner_text()
    overflow=mobile.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert overflow<=2,f"public synthetic Pages 390px horizontal overflow {overflow}"
    mobile.screenshot(path=str(OUT/"public-synthetic-mobile390.png"),full_page=True)
    mobile.close()
    print("PUBLIC_PAGES_SYNTHETIC_UI_PASS: BTC/ETH/SOL fixture, fee+cost model, JSON, 390px Chrome, no PAPER writes")

def public_pages_guard(browser):
    """CSP must block a real exchange domain, not just a fake host/CORS."""
    page=browser.new_page(viewport={"width":1360,"height":850})
    market_requests=[]
    page.on("request",lambda r: market_requests.append(r.url) if "api.kraken.com" in r.url else None)
    page.goto(URL)
    assert page.locator('meta[name="quant-preview-mode"][content="synthetic"]').count()==1
    assert page.locator('meta[http-equiv="Content-Security-Policy"]').count()==1
    blocked=page.evaluate("""async () => {
      return await new Promise(async resolve => {
        const handler=e=>{
          if(e.effectiveDirective==='connect-src' &&
             e.blockedURI.includes('api.kraken.com')){
            clearTimeout(timeout);
            document.removeEventListener('securitypolicyviolation',handler);
            resolve(e.blockedURI);
          }
        };
        const timeout=setTimeout(()=>{
          document.removeEventListener('securitypolicyviolation',handler);
          resolve(null);
        },2500);
        document.addEventListener('securitypolicyviolation',handler);
        const controller=new AbortController();
        const abort=setTimeout(()=>controller.abort(),2200);
        try {
          await fetch('https://api.kraken.com/0/public/Time',
            {mode:'cors',credentials:'omit',signal:controller.signal});
        }catch(e){}
        clearTimeout(abort);
      });
    }""")
    assert blocked and "api.kraken.com" in blocked, (
        "public Pages fixture must block official market API by connect-src CSP")
    assert market_requests==[], "public Pages must never initiate exchange network requests"
    evidence={"scope":"PUBLIC_STATIC_LOCALHOST_PROOF_NOT_HOSTED_ORIGIN",
      "captured_at_utc":datetime.now(timezone.utc).isoformat(),
      "public_fixture":"SYNTHETIC_ONLY",
      "csp_market_api_blocked":"PASS",
      "actual_market_requests":market_requests,
      "market_data_rights":"NOT_VERIFIED",
      "physical_samsung":"NOT_TESTED",
      "real_capital":"LOCKED"}
    (OUT/"public-static-csp-evidence.json").write_text(
      json.dumps(evidence,indent=2)+"\n")
    print("PUBLIC_MARKET_DATA_EGRESS_DENIED: official Kraken fetch rejected by CSP before network; no license claim")
    page.close()

def premium_demo_browser(browser):
    """Interactive English premium synthetic demo acceptance; no live data."""
    url=f"http://127.0.0.1:{PORT}/premium-demo.html"
    page=browser.new_page(viewport={"width":1420,"height":900},accept_downloads=True)
    external=[]
    page.on("request",lambda r:external.append(r.url) if not r.url.startswith("http://127.0.0.1:") else None)
    page.goto(url,wait_until="domcontentloaded")
    assert page.locator("html").get_attribute("lang")=="en"
    expect(page.locator("h1#hero-title")).to_contain_text("Catch the signal.")
    expect(page.get_by_label("FOMO Quant geometric radar logo")).to_be_visible()
    assert "CREATED BY PROOF & SIGNAL" in page.locator(".brand").inner_text().upper()
    page.locator("#explore-cta").click()
    assert page.url.endswith("#experience")
    expect(page.locator("#decision")).to_have_text("WATCH")
    page.locator('[data-scenario="concentration"]').click()
    expect(page.locator("#decision")).to_have_text("REVIEW")
    assert page.locator("#holder-concentration").inner_text()=="68%"
    page.locator('[data-scenario="chase"]').click()
    expect(page.locator("#decision")).to_have_text("NO TRADE")
    page.locator('[data-scenario="stale"]').click()
    expect(page.locator("#decision")).to_have_text("BLOCKED")
    assert page.locator("#net").inner_text()=="—"
    page.locator('[data-scenario="perpsLong"]').click()
    expect(page.locator("#trade-market")).to_have_text("FOMO PERPS")
    expect(page.locator("#trade-side")).to_have_text("LONG · 3x")
    assert page.locator("#listing-status").inner_text()=="NO · UNVERIFIED"
    assert page.locator("#gross").inner_text()!="—"
    page.locator('[data-scenario="perpsShort"]').click()
    expect(page.locator("#trade-side")).to_have_text("SHORT · 2x")
    assert page.locator("#costs").inner_text()!="—"
    assert "NOT CONNECTED" in page.locator("#experience").inner_text()
    page.locator('[data-scenario="breakout"]').click()
    page.locator("#notional").select_option("5000")
    assert page.locator("#capital-display").inner_text()=="$5,000.00"
    with page.expect_download() as download:
        page.locator("#export-fixture").click()
    data=json.loads(Path(download.value.path()).read_text())
    assert data["scope"]=="NOT_PAPER_ELIGIBLE"
    assert data["sourceType"]=="SYNTHETIC_FIXTURE"
    assert data["paperEligible"] is False
    assert data["allowedToTrade"] is False
    assert data["verifiedNet"] is None
    assert data["executedOrders"]==0
    assert data["fomoMarketVerified"] is False
    assert data["listingStatus"]=="FOMO_AVAILABILITY_UNVERIFIED"
    assert data["tradeMode"]=="FOMO SPOT"
    assert external==[]
    page.screenshot(path=str(OUT/"premium-desktop-synthetic.png"),full_page=True)
    page.close()
    mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=2)
    mobile.goto(url,wait_until="domcontentloaded")
    expect(mobile.locator("#explore-cta")).to_be_visible()
    mobile.locator("#explore-cta").click()
    mobile.locator('[data-scenario="concentration"]').click()
    expect(mobile.locator("#decision")).to_have_text("REVIEW")
    mobile.locator('[data-scenario="perpsShort"]').click()
    expect(mobile.locator("#trade-side")).to_have_text("SHORT · 2x")
    overflow=mobile.evaluate("document.documentElement.scrollWidth-innerWidth")
    assert overflow<=2,f"premium demo 390px horizontal overflow {overflow}px"
    mobile.screenshot(path=str(OUT/"premium-mobile390-synthetic.png"),full_page=True)
    mobile.close()
    print("FOMO_SCOPE_PREMIUM_BROWSER_PASS: FOMO Spot/LONG/SHORT fictional cases, 6 scenarios, owned logo, Explore, export, 390px, no API")

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
            public_pages_guard(browser)
            premium_demo_browser(browser)
            browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()

if __name__=="__main__":
    main()
