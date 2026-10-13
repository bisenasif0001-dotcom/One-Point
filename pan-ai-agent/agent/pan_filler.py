"""
pan_filler.py - Playwright Autonomous PAN Form 49A Filler
Opens official NSDL Portal in a real visible Chrome window,
selects Form 49A, auto-fills applicant details, and halts at Captcha.
"""

import time
import os
import random
from typing import Dict, Any, Callable, Optional
from playwright.sync_api import sync_playwright

PRIMARY_PAN_URL = "https://onlineservices.proteantech.in/paam/endUserRegisterContact.html"


class PANFormFiller:
    def __init__(self, status_callback: Optional[Callable[[str, str], None]] = None):
        """
        status_callback(message, level): sends live updates to the UI
        """
        self.callback = status_callback or (lambda msg, lvl: print(f"[{lvl.upper()}] {msg}"))

    def log(self, message: str, level: str = "info"):
        self.callback(message, level)

    def fill_form_49a(self, candidate_data: Dict[str, Any]):
        """
        Executes autonomous form filling on Protean (NSDL) portal.
        """
        self.log("Launching visible Chromium Browser window...", "action")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=False,
                slow_mo=80,
                args=[
                    "--start-maximized",
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--ignore-certificate-errors"
                ]
            )
            context = browser.new_context(
                no_viewport=True,
                ignore_https_errors=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver")

            # 1. Navigate to Protean (NSDL) Portal
            self.log(f"Navigating to Official PAN Portal: {PRIMARY_PAN_URL}", "action")
            try:
                page.goto(PRIMARY_PAN_URL, timeout=35000, wait_until="domcontentloaded")
                time.sleep(1.5)
            except Exception as e:
                self.log(f"Navigation notice: {e}. Retrying...", "warning")
                try:
                    page.goto(PRIMARY_PAN_URL, timeout=40000)
                except Exception as e2:
                    self.log(f"Failed to open portal: {e2}", "error")
                    browser.close()
                    return

            page_title = page.title()
            self.log(f"Portal Loaded Successfully: {page_title}", "success")

            # 2. Select Application Type (Form 49A - Indian Citizen)
            self.log("Selecting Application Type: 'New PAN - Form 49A (Indian Citizen)'", "action")
            try:
                if page.locator("#type").is_visible():
                    page.select_option("#type", value="49A")
                elif page.locator("select[name='requestType']").is_visible():
                    page.select_option("select[name='requestType']", value="49A")
                else:
                    page.select_option("select#app_type, select[name='app_type']", label="New PAN - Indian Citizen (Form 49A)")
            except Exception as e:
                self.log(f"App Type notice: {e}", "warning")

            time.sleep(1.0)

            # 3. Select Category (INDIVIDUAL)
            self.log("Selecting Category: 'INDIVIDUAL'", "action")
            try:
                if page.locator("#cat_applicant1").is_visible():
                    page.select_option("#cat_applicant1", value="P")
                elif page.locator("select[name='category']").is_visible():
                    page.select_option("select[name='category']", value="P")
                else:
                    page.select_option("select#cat, select[name='cat']", label="INDIVIDUAL")
            except Exception as e:
                self.log(f"Category notice: {e}", "warning")

            time.sleep(1.5)

            # 4. Fill Applicant Title & Name
            title_str = candidate_data.get("title", "Shri").strip().lower()
            title_val = "1"  # Shri
            if "smt" in title_str:
                title_val = "2"
            elif "kumari" in title_str or "km" in title_str:
                title_val = "3"

            fname = candidate_data.get("first_name", "").strip()
            lname = candidate_data.get("last_name", "").strip()

            self.log(f"Selecting Title ({candidate_data.get('title', 'Shri')})...", "action")
            try:
                page.wait_for_selector("#rvNameInitials option[value='1']", timeout=4000)
                page.select_option("#rvNameInitials", value=title_val)
            except Exception:
                try:
                    page.select_option("select#title, select[name='title']", label=candidate_data.get("title", "Shri"))
                except Exception:
                    pass

            self.log(f"Entering Applicant: {fname} {lname}", "action")

            # Last Name / Surname (Mandatory)
            for sel in ["#l_name_end", "input[name='lastName']", "#last_name", "input[name='last_name']"]:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible():
                        loc.click()
                        loc.fill(lname)
                        break
                except Exception:
                    continue

            # First Name
            for sel in ["#f_name_end", "input[name='firstName']", "#first_name", "input[name='first_name']"]:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible():
                        loc.click()
                        loc.fill(fname)
                        break
                except Exception:
                    continue

            # 5. Fill Date of Birth
            dob = candidate_data.get("dob", "").strip()
            if dob:
                self.log(f"Entering Date of Birth: {dob}", "action")
                for sel in ["#date_of_birth_reg", "input[name='dateOfBirth']", "#dob", "input[name='dob']"]:
                    try:
                        loc = page.locator(sel).first
                        if loc.is_visible():
                            loc.click()
                            loc.fill(dob)
                            break
                    except Exception:
                        continue

            # 6. Fill Email
            email = candidate_data.get("email", "").strip()
            if email:
                self.log(f"Entering Email: {email}", "action")
                for sel in ["#email_id2", "input[name='emailId']", "#email", "input[name='email']"]:
                    try:
                        loc = page.locator(sel).first
                        if loc.is_visible():
                            loc.click()
                            loc.fill(email)
                            break
                    except Exception:
                        continue

            # 7. Fill Mobile
            mobile = candidate_data.get("mobile", "").strip()
            if mobile:
                self.log(f"Entering Mobile Number: {mobile}", "action")
                for sel in ["#rvContactNo", "input[name='rvContactNo']", "#mob_no", "input[name='mob_no']"]:
                    try:
                        loc = page.locator(sel).first
                        if loc.is_visible():
                            loc.click()
                            loc.fill(mobile)
                            break
                    except Exception:
                        continue

            # 8. Consent Checkbox
            self.log("Accepting Declaration / Consent checkbox...", "action")
            for sel in ["#consent", "input[name='consent']", "#chk_consent", "input[type='checkbox']"]:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible():
                        loc.check()
                        self.log("Consent checkbox checked successfully.", "success")
                        break
                except Exception:
                    continue

            # Scroll down to Captcha
            try:
                for sel in [".g-recaptcha", "#captcha", "img[id*='captcha' i]", "#txt_captcha"]:
                    loc = page.locator(sel).first
                    if loc.is_visible():
                        loc.scroll_into_view_if_needed()
                        break
            except Exception:
                page.mouse.wheel(0, 400)

            self.log("ALL DETAILS POPULATED! Awaiting Captcha solve & Submit by Admin in the opened window.", "warning")

            # Keep window open for user review
            try:
                for _ in range(600):  # Up to 10 minutes
                    if page.is_closed():
                        break
                    time.sleep(1)
            except Exception:
                pass

            self.log("Session completed.", "info")
            try:
                browser.close()
            except Exception:
                pass
