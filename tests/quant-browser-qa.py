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
SOURCES=["Kraken","Coinbase Exchange","Gemini","Bybit","OKX","KuCoin","Gate.io","Bitfinex"]

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
    raise AssertionError("unexpected source: "+url)

def route_mock(route):
    obj=mock_response(route.request.url)
    if obj is None:
        route.fulfill(status=403,content_type="application/json",body='{"error":"HTTP 403"}',
                      headers={"Access-Control-Allow-Origin":"*"})
    else:
        route.fulfill(status=200,content_type="application/json",body=json.dumps(obj),
                      headers={"Access-Control-Allow-Origin":"*","Cache-Control":"no-store"})

def deterministic(browser):
    page=browser.new_page(accept_downloads=True, viewport={"width":1280,"height":900})
    page.goto(URL)
    assert "CREATED BY PROOF & SIGNAL" in page.locator("header").inner_text().upper()
    assert "Financial controls locked" in page.locator("body").inner_text()
    page.route("https://**/*",route_mock)
    page.locator("#refresh").click()
    expect(page.locator("#scan-status")).to_contain_text("7/8",timeout=25000)
    assert page.locator("#venues tr").count()==8
    assert "HTTP 403" in page.locator("#venues").inner_text()
    assert page.locator("#venues button").count()==7
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
    expect(mobile.locator("#scan-status")).to_contain_text("7/8",timeout=25000)
    assert mobile.locator("#calculate").is_visible()
    assert mobile.locator("#asset").is_visible()
    assert mobile.locator("#calculator").bounding_box() is not None
    # Tabular overflow must be contained within tablewrap, not document.
    overflow=mobile.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert overflow <= 2, f"mobile body horizontal overflow {overflow}"
    mobile.screenshot(path=str(OUT/"mobile390-mocked.png"),full_page=True)
    mobile.close()
    print("CHROMIUM_MOCKED_UI_PASS: eight configured / seven synthetic response fixtures, source selection, fees, export, fail-closed, 390px viewport, no PAPER writes")

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
    result["captured_at_utc"]=datetime.now(timezone.utc).isoformat()
    result["origin_kind"]="LOOPBACK_CHROMIUM_NOT_PROTECTED_HTTPS"
    result["browser_console_errors"]=errors[:20]
    result["source_details_available_to_client"]=True
    result["live_chromium_source_gate"]="REVIEW" # filled below by observed per-row evidence
    rows=result["rows"]
    observed=sum("RECEIVED · " in x["text"] for x in rows)
    result["observed_sources"]=observed
    result["configured_sources"]=8
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
            deterministic(browser)
            live_browser(browser)
            browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:server.kill()

if __name__=="__main__":
    main()
