import streamlit as st
from dotenv import load_dotenv
import os
import webbrowser
import threading
import http.server
import requests
from urllib.parse import urlparse, parse_qs

load_dotenv()

API_KEY = os.getenv("UPSTOX_API_KEY")
API_SECRET = os.getenv("UPSTOX_API_SECRET")
REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI")
AUTH_URL = f"https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id={API_KEY}&redirect_uri={REDIRECT_URI}"
TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"
PORT = 8000

auth_code = None

# -- HTTP server to receive redirect from Upstox --
class AuthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        query = urlparse(self.path).query
        params = parse_qs(query)
        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"<h2>Authorization successful. You can close this tab.</h2>")
        else:
            self.send_response(400)
            self.end_headers()

def run_server():
    server = http.server.HTTPServer(('localhost', PORT), AuthHandler)
    server.handle_request()

# -- Streamlit UI --
st.set_page_config(page_title="Upstox OAuth Login")
st.title("🔐 Upstox OAuth 2.0 Login")

if "access_token" not in st.session_state:
    st.session_state.access_token = None

if st.button("Login to Upstox"):
    # Launch local server to capture redirect
    threading.Thread(target=run_server, daemon=True).start()

    # Open browser for user login
    webbrowser.open(AUTH_URL)
    st.info("Please login via the browser window...")

    # Wait until code is received
    with st.spinner("Waiting for authorization..."):
        import time
        while auth_code is None:
            time.sleep(1)

        # Exchange auth code for access token
        try:
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'client_id': API_KEY,
                'client_secret': API_SECRET,
                'redirect_uri': REDIRECT_URI
            }
            response = requests.post(TOKEN_URL, headers=headers, data=data)
            response.raise_for_status()
            token_data = response.json()
            st.session_state.access_token = token_data["access_token"]
            st.success("Access token received!")

            st.subheader("🔑 Access Token")
            st.code(st.session_state.access_token)

        except Exception as e:
            st.error(f"Error getting access token: {e}")

# (Optional) Call Profile API
if st.session_state.access_token:
    st.subheader("👤 Fetching User Profile...")

    headers = {
        'Authorization': f'Bearer {st.session_state.access_token}'
    }
    try:
        url = "https://api.upstox.com/v2/portfolio/long-term-holdings"

        resp = requests.request("GET", url, headers=headers, data={})
        resp.raise_for_status()
        profile = resp.json()
        st.json(profile)
        
    except Exception as e:
        st.error(f"Could not fetch profile: {e}")
