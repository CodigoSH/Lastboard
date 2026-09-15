# Security Headers Implementation

Every response Lastboard sends carries the same set of headers. This page goes through them,
and then through HSTS in detail because it is the only one with a setup cost and a way to lock
yourself out.

| Header | Value | Sent |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `default-src 'self'` plus a **per-request script nonce** — [full policy](overview.md#headers) | always |
| `X-Content-Type-Options` | `nosniff` | always |
| `X-Frame-Options` | `SAMEORIGIN` | always |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | always |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | **HTTPS only** |
| `X-Robots-Tag` | `noindex, nofollow` | only when `DEMO_ONLY=true` |

Stored icons get a second, much tighter policy of their own —
`default-src 'none'; style-src 'unsafe-inline'; sandbox` — so an SVG opened directly can do
nothing at all. See the [Security Overview](overview.md) for the reasoning behind each one.

## HSTS (HTTP Strict Transport Security)

### What is HSTS?

HSTS is a security header that tells browsers to **always** use HTTPS when connecting to your domain, even if the user types `http://` in the address bar or clicks on an HTTP link.

### Implementation Details

**Header Value:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Parameters:**
- `max-age=31536000`: Browser remembers this for 1 year (365 days)
- `includeSubDomains`: Applies to all subdomains (e.g., `api.yourdomain.com`)
- `preload`: Eligible for browser preload lists (hardcoded HTTPS-only)

### How It Works

1. **First Visit:** User connects via HTTPS → Server sends HSTS header
2. **Browser Stores:** Browser remembers "always use HTTPS for this domain"
3. **Future Visits:** Browser automatically upgrades HTTP → HTTPS (client-side, no request sent)
4. **Invalid Cert:** Browser blocks connection (no "proceed anyway" option)

### Security Benefits

**Prevents SSL Stripping Attacks**
- Attacker can't downgrade HTTPS → HTTP on public WiFi

**Prevents Mixed Content**
- Forces all resources to load over HTTPS

**Improves User Privacy**
- No HTTP requests ever sent (avoids ISP/network snooping)

**SEO Benefits**
- Google prioritizes HTTPS sites in rankings

### Requirements

⚠️ **IMPORTANT:** HSTS only activates when:
1. Connection is over HTTPS (TLS/SSL)
2. Valid SSL certificate is present

**The implementation automatically detects:**
- Direct TLS connections (`r.TLS != nil`)
- Reverse proxy HTTPS (`X-Forwarded-Proto: https`)
- AWS CloudFront (`CloudFront-Forwarded-Proto: https`)

### Testing HSTS

**1. Check Header (curl):**
```bash
curl -I https://yourdomain.com
# Should return:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**2. Browser DevTools:**
- Open Network tab
- Check response headers
- Look for `Strict-Transport-Security`

**3. Online Scanners:**
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

### HSTS Preload List

To submit your domain to browser preload lists:

1. **Ensure you meet requirements:**
   - Serve valid certificate on root and all subdomains
   - Redirect HTTP → HTTPS (301 permanent)
   - Serve HSTS header on HTTPS with `preload` directive
   - `max-age` at least 31536000 seconds (1 year)

2. **Submit to preload list:**
   - Visit: https://hstspreload.org/
   - Enter your domain
   - Follow submission process

3. **Warning:** Preload is **difficult to remove**
   - Takes months to propagate removal
   - Only submit if you're 100% committed to HTTPS forever

### Troubleshooting

**Problem:** "HSTS header not appearing"
- **Solution:** Ensure you're accessing via HTTPS
- HSTS is intentionally NOT sent over HTTP

**Problem:** "Can't access site after enabling HSTS"
- **Cause:** Invalid/expired SSL certificate
- **Solution:** Fix certificate issue first

**Problem:** "Subdomains not working"
- **Cause:** `includeSubDomains` directive affects ALL subdomains
- **Solution:** Ensure all subdomains have valid HTTPS

**Clear HSTS in Browser (Emergency):**

**Chrome/Edge:**
1. Visit `chrome://net-internals/#hsts`
2. Enter domain in "Delete domain security policies"
3. Click Delete

**Firefox:**
1. Close Firefox
2. Delete `SiteSecurityServiceState.txt` in profile folder
3. Restart Firefox

### Why the protocol headers are trusted without `TRUST_PROXY`

Deciding whether a request arrived over HTTPS reads `X-Forwarded-Proto` and
`CloudFront-Forwarded-Proto` **without** gating on `TRUST_PROXY`, and that is deliberate: most
people run Lastboard behind a reverse proxy, and the `Secure` flag on the session cookie should
work out of the box rather than after one more environment variable.

The risk profiles are not the same, and they are kept apart on purpose. Forging the protocol
header only makes cookies *more* strictly scoped. Forging `X-Forwarded-For` would let a caller
choose their own identity and shake off the login lockout — so **that** one is gated on
`TRUST_PROXY`, and even then only the entry your own proxy appended is read. Do not unify them.

### Additional Security Headers (Already Implemented)

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `Content-Security-Policy` with a per-request nonce - see the [Security Overview](overview.md#headers)

### References

- [OWASP HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [MDN HSTS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [RFC 6797 - HSTS Specification](https://tools.ietf.org/html/rfc6797)
