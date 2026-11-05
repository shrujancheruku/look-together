# How can the Cloud Run backend learn a request's country without logging the IP?

Research for [#152](https://github.com/shrujancheruku/look-together/issues/152) (map [#142](https://github.com/shrujancheruku/look-together/issues/142)). Sources read on 2026-11-05. Logging constraints come from [the closed list](../privacy/closed-list.md).

## Short answer

- **Cloud Run on its own gives no geolocation.** Its docs don't document any geo header. The container sees the client IP only in `X-Forwarded-For`, and that doesn't help when the aim is to never touch the IP.
- **A global external Application Load Balancer can do the lookup for us.** A custom request header such as `X-Client-Region: {client_region}` (country, e.g. `US`) or `X-Client-Subdivision: {client_region_subdivision}` (e.g. `USUT`) reaches Cloud Run already resolved. The backend reads one header and never parses an IP. Google doesn't log header values, and Cloud Run's request log has no header fields.
- **The load balancer's own request logging is off by default** for new backend services, and it can be turned off (or set to `sampleRate 0`). If it were on, every entry would carry `httpRequest.remoteIp`, so it has to stay off. That fits the closed list: Cloud Run's built-in request logs stay excluded as they are now.
- **Cost:** about $0.025/h for the forwarding rule (up to 5 rules per project), roughly $18/month, plus about $0.008 per GiB processed. Set `internal-and-cloud-load-balancing` ingress and/or disable the `run.app` URL so no request can skip the header.
- **Fallback, a bundled database:**
  - **IPinfo Lite**: CC BY-SA 4.0, commercial use explicitly allowed, country + ASN only, daily updates, about 25 MB MMDB.
  - **DB-IP Lite**: CC BY 4.0, monthly updates. Country is 8 MB, City (which has state) is 121 MB. Web pages that use it must carry a link back to DB-IP.
  - **MaxMind GeoLite2**: free EULA with attribution, needs an account and licence key, and old copies must be deleted within 30 days of each release (Tue/Fri). It has the most strings attached.
- **Utah needs a subdivision, not a country.** The closed list's in-memory Utah check needs state-level data. `{client_region_subdivision}` gives it for free. Of the bundled options, only DB-IP City Lite and GeoLite2 City have it; IPinfo Lite and the country editions don't.
- **Firebase Hosting:** request logs to Cloud Logging are **opt-in** (off unless we link Cloud Logging). If we turned them on, they would carry `remoteIp`, `userAgent`, `referer`, `remoteIpCountry` and `remoteIpCity`. Separately, Google's Firebase privacy page says Hosting itself "retains IP data for a few months" for abuse detection and usage analysis, as a **global** service. That second part is outside our control and needs a line in the disclosure.

## 1. Cloud Run on its own

- The [container runtime contract](https://docs.cloud.google.com/run/docs/container-contract) documents no geolocation or client-location header.
- Client IP reaches the code only through `X-Forwarded-For`: "The first IP in this list is generally the IP of the client that created the request." ([Cloud Run functions request headers](https://docs.cloud.google.com/functions/docs/reference/headers))
- Request logs are automatic, and "you cannot control the amount of request logs directly from Cloud Run", though you "can make use of the logs exclusion feature from Cloud Logging". ([Cloud Run logging](https://docs.cloud.google.com/run/docs/logging)) Request logs use the standard `HttpRequest` type, which includes `remoteIp` ("The IP address (IPv4 or IPv6) of the client that issued the HTTP request") and `userAgent`. It has no field for arbitrary request headers. ([LogEntry reference](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry))
- So reading the IP in our code and running a lookup is possible, but then our process handles the IP. A header the load balancer has already resolved means our code never sees it.

## 2. Global external Application Load Balancer, custom request headers

### What it gives

From [Create custom headers in backend services (global)](https://docs.cloud.google.com/load-balancing/docs/https/custom-headers-global) and the [classic page](https://docs.cloud.google.com/load-balancing/docs/https/custom-headers):

| Variable | Gives |
|---|---|
| `{client_region}` | "The country (or region) associated with the client's IP address", a Unicode CLDR region code (mostly matches ISO 3166), e.g. `US`, `FR` |
| `{client_region_subdivision}` | State or province, e.g. `USCA` |
| `{client_city}`, `{client_city_lat_long}` | City name, coordinates (we don't need these) |
| `{client_ip_address}` | The IP itself (don't use) |

- "Geographic values (regions, subdivisions, and cities) are estimates based on the client's IP address." Google updates the data "from time to time".
- The location comes from the packet source IP, not from `X-Forwarded-For`, so a client can't spoof it with a header.
- Unknown values expand to an empty string. The backend needs a fallback for that case (treat it as unknown).
- Custom request headers are set on **backend services**. Cloud Run sits behind them as a serverless NEG, which the global external ALB supports ([serverless NEGs](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts)). Limits: 16 headers / 8 KB per backend service. Names can't start with `X-Goog-`, `X-Google`, `X-GFE` or `X-Amz-`.
- "Because Google Cloud doesn't log header values, these values can't be recovered." ([External ALB overview](https://docs.cloud.google.com/load-balancing/docs/https))

### Making every request go through it

- Ingress `internal-and-cloud-load-balancing`: "Direct requests to the `run.app` URL from the internet are not allowed." The `run.app` URL can also be disabled outright. ([Ingress](https://docs.cloud.google.com/run/docs/securing/ingress))
- Google recommends the global external ALB for custom domains on Cloud Run anyway. Cloud Run domain mapping is Preview and "not recommended for production services". ([Mapping custom domains](https://docs.cloud.google.com/run/docs/mapping-custom-domains)) We'd likely need the load balancer for `api.` domains regardless, so the header comes almost free.

### Its request logging

From [ALB logging and monitoring](https://docs.cloud.google.com/load-balancing/docs/https/https-logging-monitoring):

- Disabled by default for backend services created after the June 2020 GA. "You enable or disable logging for each backend service."
- If enabled, each record always includes `httpRequest` (so `remoteIp` and `userAgent`). Optional fields default to `EXCLUDE_ALL_OPTIONAL`, but you can't drop `remoteIp`.
- `logConfig.sampleRate` from 0.0 to 1.0 (default 1.0 when enabled). 0.0 is the same as disabled.
- Exception: **backend buckets** always log and can't be turned off. We'd serve only Cloud Run backend services through this load balancer.
- For the closed list: keep `logConfig.enable=false` in the infra config, with a check that fails if it's ever turned on. As a second guard, add an exclusion filter on `_Default` for `resource.type="http_load_balancer"`, the same way Cloud Run request logs are excluded.

### Cost

From [Cloud Load Balancing pricing](https://cloud.google.com/load-balancing/pricing): forwarding rules cost $0.025/h for the first five per project and $0.01/h for each one after that. Data processing is about $0.008/GiB inbound and outbound (it varies by region). One global forwarding rule is about $18/month before data. Google's own example: 10 rules + 2,048 GiB in Iowa ≈ $71/month. Check the live page before budgeting.

## 3. Bundled GeoIP databases (Node, MMDB via `maxmind` / `mmdb-lib`)

| | IPinfo Lite | DB-IP Lite | MaxMind GeoLite2 |
|---|---|---|---|
| Licence | CC BY-SA 4.0; "freely use and incorporate the data into commercial and non-commercial applications" ([Lite](https://ipinfo.io/lite)) | CC BY 4.0 ([Country Lite](https://db-ip.com/db/download/ip-to-country-lite)) | GeoLite EULA, data under CC BY-SA 4.0 ([EULA](https://www.maxmind.com/en/geolite2/eula)) |
| Attribution | Credit IPinfo, e.g. "IP address data is powered by IPinfo", or a link anywhere on our site/app | Credit DB-IP.com, **and** web apps must link back to DB-IP on pages that use the results | "This product includes GeoLite Data created by MaxMind, available from …" |
| Other strings | Download needs a free token | None | Account + licence key; must "destroy any old versions … within thirty (30) days" of a new release (§6.3); no disclosure to third parties without consent (§6.1); no use to locate a household (§5); MaxMind may stop the free offer (§9). Apps for outside users are allowed with attribution; a commercial licence is needed only to drop attribution ([KB](https://support.maxmind.com/knowledge-base/articles/sell-or-display-data-from-geolite-databases-and-web-services)) |
| Granularity | Country, continent, ASN, **no subdivision** ([db page](https://ipinfo.io/developers/ipinfo-lite-database)) | Country edition; City edition adds state/province ([City Lite](https://db-ip.com/db/download/ip-to-city-lite)) | Country edition; City edition adds subdivision |
| Size | MMDB 24.8 MB | Country MMDB 8.1 MB; City 121 MB (.gz) | not stated on the pages read |
| Updates | Daily | Monthly | Country and City every Tue and Fri ([download and update](https://support.maxmind.com/knowledge-base/articles/download-and-update-maxmind-databases)) |
| Accuracy | No figure published | Own "accuracy index" 81 (Country Lite) vs 93 paid; City Lite 77 vs 96 | 99.8 % country level for "GeoIP products" in general, not GeoLite specifically ([accuracy](https://support.maxmind.com/hc/en-us/articles/4407630607131-Geolocation-Accuracy)); GeoLite City "considerably less accurate" than paid |

Notes:

- None of the three publishes a like-for-like country accuracy figure for its free tier, so we can't rank them on accuracy from primary sources.
- Share-alike (IPinfo, MaxMind) applies to adapted data we share. Reading the database in memory on our server doesn't share it, but **this is our reading, not the licensor's.**
- Using a database means our process reads the IP for a moment. That fits "in memory only", provided the logger allowlist keeps it out of every log, as it does now.

## 4. Firebase Hosting (the closed list's "Still to check")

- **Our Cloud Logging:** Hosting request logs reach Cloud Logging only if we link Cloud Logging in the Firebase console and pick sites. Linking needs Owner/Editor/Firebase Develop Admin. If linked, logs (`firebase_domain` resource, `webrequests` log) carry `httpRequest.remoteIp`, `referer` and `userAgent`, plus `jsonPayload.remoteIpCountry` and `remoteIpCity`. They are deleted after 30 days by default. ([Web request logs](https://firebase.google.com/docs/hosting/web-request-logs-and-metrics)) We should leave it unlinked. If it were ever linked, those entries would land in the `_Default` sink and must be excluded there.
- **Google's own handling:** "Hosting uses IP addresses of incoming requests to detect abuse and provide customers with detailed analysis of usage data" and "Hosting retains IP data for a few months". Hosting is listed among "Global services" that "could process data at any of the Google Cloud Platform locations". ([Firebase privacy](https://firebase.google.com/support/privacy)) We can't turn this off. It belongs in "Who else sees what" as Google, Firebase Hosting: IP address of web visitors, global, a few months.
- Firebase Hosting is not covered by the Google Cloud Terms of Service ([Mapping custom domains](https://docs.cloud.google.com/run/docs/mapping-custom-domains)).

## Recommendation

1. Put the Cloud Run services behind one global external ALB (project `look-together`), with custom request headers `X-Client-Country: {client_region}` and `X-Client-Subdivision: {client_region_subdivision}`. Set ingress to `internal-and-cloud-load-balancing` and disable `run.app`.
2. The backend reads only those headers, never `X-Forwarded-For`. An empty value means unknown.
3. Keep load balancer logging off, guard it in config, and add an `http_load_balancer` exclusion on `_Default`.
4. Closed list: add Firebase Hosting's IP retention under "Who else sees what" and close its "Still to check" item. Note that the country/subdivision header is used in memory and never stored.
5. If the load balancer is dropped, fall back to DB-IP City Lite (CC BY 4.0, has state; link back to DB-IP on the web) or IPinfo Lite (if country alone is enough).

## Open questions

- Does Google's `client_region_subdivision` cover US states reliably enough for the Utah check? No accuracy figure is published.
- The live per-GiB price for our regions. The pricing page didn't render for this research, and the figures come from Google's search snippets of it.
