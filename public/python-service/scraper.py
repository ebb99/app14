import os
import psycopg2
import logging
import time
import re
import requests
from datetime import date, timedelta
from bs4 import BeautifulSoup
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
# =========================
# CONFIG
# =========================
HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

RETRIES = 5

# =========================
# LOGGING
# =========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# =========================
# DB
# =========================
def get_connection():
    db_url = os.environ["DATABASE_URL"]

    if "localhost" in db_url:
        return psycopg2.connect(db_url)  # lokal ohne SSL
    else:
        return psycopg2.connect(db_url, sslmode="require")


# =========================
# HTTP REQUEST MIT RETRY
# =========================
def fetch(url):
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)

            if r.status_code == 200:
                return r.text

            logging.warning(f"Status {r.status_code} bei {url}")

        except Exception as e:
            logging.warning(f"Fetch Fehler {attempt+1}: {url} -> {e}")

        time.sleep(2 * (attempt + 1))

    return None


# =========================
# LINKS
# =========================
def extract_links(html, typ):
    soup = BeautifulSoup(html, "html.parser")
    links = []

    pattern = rf'/deutschland-bundesliga/ma\d+/[^/]+_[^/]'

    for a in soup.find_all("a", href=True):
        href = a["href"]

        if re.search(pattern, href):
            if href.startswith("/"):
                href = "https://www.sportschau.de" + href

            if href not in links:
                links.append(href)

    return links[:9]


# =========================
# PARSER
# =========================
def extract_text(soup, selector):
    el = soup.select_one(selector)
    return el.get_text(strip=True) if el else ""


def extract_spieltag(soup):
    h = soup.find("h3", class_="hs-scoreboard-headline")
    m = re.search(r"(\d+)\.\s*Spieltag", h.text) if h else None
    return m.group(1) if m else None


def extract_datum(soup):
    h = soup.find("h3", class_="hs-scoreboard-headline")
    m = re.search(r"(\d{2}\.\d{2}\.\d{4})", h.text) if h else None
    return m.group(1) if m else None


def extract_game(html):
    soup = BeautifulSoup(html, "html.parser")

    heim = extract_text(soup, "div.team-shortname-home")
    gast = extract_text(soup, "div.team-shortname-away")
    zeit = extract_text(soup, "div.match-time")
    score = extract_text(soup, "div.match-result")

    datum = extract_datum(soup)
    spieltag = extract_spieltag(soup)

    if not score:
        score = "n/a"
    if not heim or not gast:
        return None
    return {
        "spieltag_nummer": spieltag,
        "Datum": datum,
        "time": zeit,
        "heim": heim,
        "gast": gast,
        "score": score,
        "kennung": f"{datum}_{heim}_{gast}"
    }
    

# =========================
# DB UPSERT
# =========================
def eintrag_db(cur, conn, results):

    for g in results:

        # 🔥 VALIDIERUNG
        if not all([
            g.get("spieltag_nummer"),
            g.get("Datum"),
            g.get("heim"),
            g.get("gast")
        ]):
            logging.warning(f"❌ Ungültiger Datensatz: {g}")
            continue

        try:
            cur.execute("""
                INSERT INTO spiele_web
                (spieltag, datum, zeit, heimverein, gastverein, score, kennung)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                g["spieltag_nummer"],
                g["Datum"],
                g.get("time", ""),
                g["heim"],
                g["gast"],
                g.get("score", "n/a"),
                g.get("kennung", "")
            ))

        except Exception as e:
            logging.error(f"DB Fehler: {e} -> {g}")
            conn.rollback()

    conn.commit()

# =========================
# MAIN SCRAPER
# =========================
def run_scraper():
    logging.info("🚀 Scraper gestartet")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE spiele_web RESTART IDENTITY")
    conn.commit()
    try:
        heute = date.today()
        dat1 = heute - timedelta(days=15)
        dat2 = heute + timedelta(days=15)
        logging.info(f"⏳ Suche Spieltage zwischen {dat1} und {dat2}")

        cur.execute("""
            SELECT MIN(spieltag), MAX(spieltag)
            FROM spielplan
            WHERE datum > %s AND datum < %s
        """, (dat1, dat2))



        min_tag, max_tag = cur.fetchone()





        # if not min_tag or not max_tag:
        #     logging.warning("Keine Spieltage gefunden")
        #     return

        base = "https://www.sportschau.de/live-und-ergebnisse/fussball/deutschland-bundesliga/se94724/2025-2026/ro262400/spieltag/md"

        for spieltag in range(int(min_tag), int(max_tag) + 1):

            # url = f"{base}{spieltag}/spiele-und-ergebnisse"
            url = f"{base}{spieltag}/"
            logging.info(f"🌐 Spieltag {spieltag}")
            logging.info(f"🔍 Scrape URL: {url}")

            html = fetch(url)

            if not html:
                logging.warning(f"❌ Kein HTML für Spieltag {spieltag}")
                continue

            game_links = extract_links(html, "spiele-und-ergebnisse ")

            if not game_links:
                logging.warning(f"❌ Keine Spiele gefunden: {spieltag}")
                continue

            results = []

            for link in game_links:
                game_html = fetch(link)

                if not game_html:
                    continue

                data = extract_game(game_html)
                
                if not data:
                    continue

                if data["heim"] and data["gast"]:
                    results.append(data)

            if results:
                eintrag_db(cur, conn, results)

    except Exception:
        logging.exception("SCRAPER ERROR")

    finally:
        cur.close()
        conn.close()

    logging.info("✅ Scraper fertig")
if __name__ == "__main__":
    run_scraper()