# Email Migration Guide: Krystal/123-reg to Cloudflare

This guide will walk you through migrating your @circleseven.co.uk email from Krystal hosting/123-reg to Cloudflare Email Routing.

## Overview

**What you're doing:**
- Moving DNS management to Cloudflare
- Setting up Cloudflare Email Routing to forward emails to a personal inbox
- Cancelling email hosting with Krystal/123-reg

**Important Notes:**
- Cloudflare Email Routing is **free** for forwarding
- It does **not** provide mailboxes - it only forwards to existing email addresses
- You'll need an existing email (Gmail, Outlook, etc.) to receive forwarded emails
- Cloudflare does **not** support sending email from custom domains (you'll need a separate service for this)

---

## Prerequisites

- [ ] Access to your Cloudflare account
- [ ] Access to your 123-reg account
- [ ] Access to your Krystal hosting account
- [ ] A personal email address (Gmail, Outlook, etc.) to forward emails to
- [ ] Backup of any important emails from your current inbox

---

## Phase 1: Preparation & Backup

### Step 1.1: Document Current Email Setup

**At Krystal/123-reg:**
1. Log in to your Krystal control panel
2. Navigate to your email settings
3. Document:
   - [ ] All email addresses currently set up (e.g., info@circleseven.co.uk, contact@circleseven.co.uk)
   - [ ] Any email forwards already configured
   - [ ] Any email filters or rules

### Step 1.2: Backup Existing Emails

**Important:** Once you migrate, you'll lose access to your old mailbox unless you back it up.

**Option A: Using Email Client (Recommended)**
1. Set up an email client (Thunderbird, Outlook, Apple Mail)
2. Add your Krystal email account using IMAP
3. Create local folders
4. Copy all emails to local folders
5. Export as `.mbox` or `.pst` files

**Option B: Using Webmail**
1. Log in to your Krystal webmail
2. Select all emails
3. Forward them to your personal email or download as `.eml` files

### Step 1.3: Notify Important Contacts (Optional)

If you send emails from your custom domain, consider:
- [ ] Notifying important contacts of temporary email changes
- [ ] Setting up an auto-reply mentioning potential delays

---

## Phase 2: DNS Migration to Cloudflare

### Step 2.1: Add Domain to Cloudflare

1. Log in to **Cloudflare** (https://dash.cloudflare.com)
2. Click **"Add a site"** or **"Add domain"** (button text may vary)
3. Enter **circleseven.co.uk**
4. Select **Free plan**
5. Click **"Add site"** or **"Continue"**

### Step 2.2: Review DNS Records

Cloudflare will scan and import your existing DNS records from 123-reg.

**Review and verify:**
- [ ] A records (website)
- [ ] MX records (email - these will be replaced)
- [ ] CNAME records
- [ ] TXT records (SPF, DKIM if any)

**Make note of current MX records** (you'll replace these later):
```
Example current MX records (will vary):
Priority 10: mail.krystal.co.uk
Priority 20: mail2.krystal.co.uk
```

### Step 2.3: Update Nameservers at 123-reg

**First, get your Cloudflare nameservers:**
1. In your **Cloudflare dashboard**, look for the nameserver assignment
2. Cloudflare will show you **two specific nameservers** assigned to your domain
3. They will look something like:
   ```
   Example (yours will be different):
   ava.ns.cloudflare.com
   bruce.ns.cloudflare.com
   ```
4. **Copy these** - you'll need them in the next step

**At 123-reg:**
1. Log in to your **123-reg account**
2. Go to **"Manage Domains"**
3. Select **circleseven.co.uk**
4. Click **"Manage"** → **"Change Nameservers"**
5. Select **"Use custom nameservers"**
6. **Replace** the existing nameservers with the Cloudflare nameservers you copied
7. Save changes

**⏱️ Wait time:** DNS propagation can take 24-48 hours, but usually completes within 1-2 hours.

### Step 2.4: Verify DNS is Active on Cloudflare

**Check in Cloudflare:**
1. Go to your domain overview in Cloudflare
2. Wait for status to change from **"Pending"** to **"Active"**
3. You'll receive an email confirmation when active

**Verify using command line:**
```bash
dig NS circleseven.co.uk
# Should show Cloudflare nameservers
```

---

## Phase 3: Set Up Cloudflare Email Routing

### Step 3.1: Enable Email Routing

**In Cloudflare:**
1. Go to your domain dashboard
2. Click **"Email"** in the left sidebar
3. Click **"Email Routing"**
4. Click **"Get started"** or **"Enable Email Routing"**

### Step 3.2: Configure Destination Address

1. Click **"Destination addresses"**
2. Click **"Add destination address"**
3. Enter your **personal email** (e.g., yourname@gmail.com)
4. Click **"Send verification email"**
5. Check your personal inbox
6. Click the verification link
7. Your destination is now verified ✅

### Step 3.3: Create Email Forwarding Rules

**Option A: Forward Everything (Catch-All)**
1. Go to **"Routing rules"**
2. Click **"Create address"**
3. Select **"Catch-all address"**
4. Choose your verified destination email
5. Click **"Save"**

**Option B: Forward Specific Addresses**
1. Go to **"Routing rules"**
2. Click **"Create address"**
3. Enter the local part (e.g., **info** for info@circleseven.co.uk)
4. Choose your verified destination email
5. Click **"Save"**
6. Repeat for other addresses (contact@, hello@, etc.)

### Step 3.4: Cloudflare Adds DNS Records Automatically

Cloudflare will automatically add:
- **MX records** pointing to Cloudflare's email servers
- **TXT records** for email authentication (SPF)

**Verify these were added:**
1. Go to **"DNS"** → **"Records"**
2. Look for new MX records like:
   ```
   Type: MX
   Name: @
   Mail server: route1.mx.cloudflare.net
   Priority: 1
   ```

---

## Phase 4: Testing

### Step 4.1: Test Email Forwarding

**Send test emails:**
1. From an external email (Gmail, etc.), send a test email to **info@circleseven.co.uk**
2. Check your personal inbox (including spam folder)
3. You should receive the forwarded email within minutes

**If email doesn't arrive:**
- Check Cloudflare Email Routing logs (Email → Routing rules → View logs)
- Verify your destination email is verified
- Check spam folder
- Wait 10-15 minutes for DNS to fully propagate

### Step 4.2: Test Multiple Addresses

If you set up multiple forwarding addresses:
- [ ] Test each one individually
- [ ] Verify they all forward correctly

---

## Phase 5: Sending Email (Optional)

**Important:** Cloudflare Email Routing only **receives and forwards** email. It does **not** let you send email from your custom domain.

### Option A: Send Using Gmail (Free)

**Set up Gmail to send as your custom domain:**

1. In **Gmail**, click the gear → **"See all settings"**
2. Go to **"Accounts and Import"**
3. Under **"Send mail as"**, click **"Add another email address"**
4. Enter:
   - Name: Your Name
   - Email: info@circleseven.co.uk
   - ✅ Treat as an alias
5. Click **"Next Step"**
6. Choose **"Send through Gmail"** (easier) or configure SMTP
7. Verify the email address by clicking the link sent to your custom domain
8. You can now send emails from Gmail appearing as info@circleseven.co.uk

**Limitations:**
- Gmail shows "via gmail.com" in recipient's inbox
- May be flagged as spam if not properly configured

### Option B: Use a Transactional Email Service

For professional sending (no "via" warnings):

**Recommended services:**
- **Mailgun** (Free tier: 5,000 emails/month)
- **SendGrid** (Free tier: 100 emails/day)
- **Amazon SES** (Pay as you go, very cheap)
- **Resend** (Free tier: 3,000 emails/month)

**Setup involves:**
1. Sign up for service
2. Add and verify circleseven.co.uk
3. Add DNS records (SPF, DKIM, DMARC)
4. Configure SMTP settings in your email client

### Option C: Keep Krystal for Sending Only

If you need professional sending capability:
- Keep a minimal Krystal email account for sending
- Use Cloudflare Email Routing for receiving
- Downgrade Krystal plan to cheapest option

---

## Phase 6: Cleanup & Cancellation

### Step 6.1: Monitor for 30 Days

**Before cancelling anything:**
- [ ] Test email forwarding for at least 1-2 weeks
- [ ] Ensure all important emails are being received
- [ ] Verify no emails are being lost

### Step 6.2: Cancel Krystal Email Hosting

**Only after successful migration:**

1. Log in to **Krystal account**
2. Navigate to your hosting/email package
3. Request cancellation or downgrade
4. Keep your domain registration if it's with 123-reg (you still need this!)

**Important:**
- ❌ Do NOT cancel your domain registration
- ✅ Only cancel the email/hosting package

### Step 6.3: Update Contact Information

**Update your email address in:**
- [ ] Important online accounts
- [ ] Professional profiles (LinkedIn, etc.)
- [ ] Email signature
- [ ] Business cards (if applicable)

---

## Troubleshooting

### Emails Not Being Received

**Check:**
1. DNS propagation complete? (use https://dnschecker.org)
2. MX records pointing to Cloudflare? (check DNS records)
3. Destination email verified in Cloudflare?
4. Check Cloudflare Email Routing logs
5. Check spam folder in destination email

### Emails Going to Spam

**Fix:**
1. Add SPF record if not already added by Cloudflare
2. Add DMARC record:
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=none; rua=mailto:info@circleseven.co.uk
   ```
3. Mark emails as "Not Spam" in your destination inbox

### Can't Send Emails

**Remember:**
- Cloudflare Email Routing does NOT support sending
- Use one of the options in Phase 5
- Most common solution: Send via Gmail with "Send as" feature

---

## Summary Checklist

### Pre-Migration
- [ ] Documented all current email addresses
- [ ] Backed up existing emails
- [ ] Have personal email ready for forwarding

### Migration
- [ ] Added domain to Cloudflare
- [ ] Updated nameservers at 123-reg
- [ ] Verified DNS is active on Cloudflare
- [ ] Enabled Email Routing in Cloudflare
- [ ] Added and verified destination email
- [ ] Created forwarding rules

### Testing
- [ ] Tested email forwarding
- [ ] All addresses working correctly
- [ ] Set up sending (if needed)

### Cleanup
- [ ] Monitored for 30 days
- [ ] Cancelled Krystal email hosting
- [ ] Updated contact information

---

## Additional Resources

- **Cloudflare Email Routing Docs:** https://developers.cloudflare.com/email-routing/
- **DNS Propagation Checker:** https://dnschecker.org
- **MX Record Checker:** https://mxtoolbox.com/
- **Email Header Analyzer:** https://toolbox.googleapps.com/apps/messageheader/

---

## Need Help?

If you run into issues:
1. Check Cloudflare's Email Routing documentation
2. Contact Cloudflare support (available on free plan)
3. Check the troubleshooting section above
4. Verify DNS records are correct

**Good luck with your migration!**
