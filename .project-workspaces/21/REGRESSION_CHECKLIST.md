# Compani — Pre-Deploy Regression Checklist

Run this manually before every deployment. Takes ~5 minutes.
Check each box. If anything fails, do NOT deploy until fixed.

---

## 🔐 Auth
- [ ] New user signup with email/password completes without error
- [ ] Privacy Policy and Terms links visible and tappable on signup screen
- [ ] Existing user sign in lands on home screen (not onboarding)
- [ ] Sign out clears session and returns to landing page
- [ ] Password reset email sends successfully

## 🧭 Navigation & Refresh
- [ ] Refreshing any page (/, /browse, /chat/xxx, /settings) does NOT 404
- [ ] Pull-to-refresh on home screen reloads data
- [ ] Navigating away and back to a page does NOT lose visible content
- [ ] App returning from background shows current data (not stale)

## 💬 Chat
- [ ] Sending a message gets a response
- [ ] Chat history loads on open
- [ ] Images (selfie, activity) generate and display in chat
- [ ] Chat page does NOT crash or blank when navigating back to it

## 🎨 Studio / Companion
- [ ] Creating a new companion completes and shows avatar
- [ ] Editing an existing companion saves changes
- [ ] Companion avatar visible on home screen and in chat

## 📓 Wellness / Journal
- [ ] Typing in Think Freely survives switching away and back to the tab
- [ ] Typing in Journal Entry survives switching away and back
- [ ] Saving a journal entry succeeds and clears the field

## 🔔 Core Data
- [ ] Home screen shows correct companion name and avatar
- [ ] Notification badge count reflects reality
- [ ] Settings page loads profile data correctly

## 📱 PWA / Install
- [ ] App icon on home screen has no Chrome badge
- [ ] App opens to correct screen after being backgrounded
- [ ] Offline banner shows when network drops

---

**If a previously passing item starts failing after a deploy — that is a regression.**
Document it: what changed, what broke, what fixed it.
