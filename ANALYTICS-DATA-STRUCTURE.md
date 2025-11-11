# Analytics Data Structure

This document describes the enhanced analytics data structure designed for future graphs, charts, and detailed statistics.

## Data Storage Location

**Storage**: Netlify Blobs (key-value store that doesn't trigger deploys)
**Access**: Via `/.netlify/functions/analytics-track` API endpoint
**Key**: `analytics-data` in `analytics` store

---

## Data Structure

### 1. Page Views (Basic Counters)

```json
{
  "pageViews": {
    "/path/to/page": 42,
    "/another/page": 15
  }
}
```

**Usage**: Quick totals, top pages list

---

### 2. Time-Series Data by Day

```json
{
  "viewsByDay": {
    "2025-11-10": 127,
    "2025-11-11": 98,
    "2025-11-12": 145
  }
}
```

**Retention**: Last 30 days
**Usage**: Line/bar charts showing daily traffic trends
**Chart Ideas**:
- 7-day, 30-day traffic trends
- Day-over-day comparison
- Weekly patterns

---

### 3. Time-Series Data by Hour

```json
{
  "viewsByHour": {
    "2025-11-10 14": 12,
    "2025-11-10 15": 18,
    "2025-11-10 16": 9
  }
}
```

**Retention**: Last 30 days (720 hours)
**Usage**: Hourly traffic patterns, peak hours
**Chart Ideas**:
- 24-hour heatmap
- Traffic by hour of day
- Peak traffic times

---

### 4. Detailed Page View Records

```json
{
  "pageViewDetails": {
    "/blog/post": [
      {
        "timestamp": "2025-11-10T14:32:15.123Z",
        "sessionId": "sess_1699627935_abc123",
        "referrer": "google.com",
        "browser": "Chrome",
        "device": "Desktop"
      }
    ]
  }
}
```

**Retention**: Last 1000 views per page
**Usage**: Detailed analysis per page, traffic sources
**Chart Ideas**:
- Traffic sources breakdown
- Device/browser mix per page
- Referrer analysis

---

### 5. Session Tracking

```json
{
  "sessions": {
    "sess_1699627935_abc123": {
      "firstSeen": "2025-11-10T14:30:00.000Z",
      "lastSeen": "2025-11-10T14:45:00.000Z",
      "pageViews": 5,
      "pages": ["/", "/about", "/blog", "/contact"]
    }
  }
}
```

**Retention**: Active sessions from last 7 days
**Usage**: Session duration, pages per session, user journeys
**Metrics Available**:
- Average session length
- Pages per session
- Most common user paths
- Bounce rate (single-page sessions)

---

### 6. Device Statistics

```json
{
  "devices": {
    "Desktop": 234,
    "Mobile": 187,
    "Tablet": 23
  }
}
```

**Usage**: Device breakdown
**Chart Ideas**:
- Pie chart of device types
- Trend of mobile vs desktop over time

---

### 7. Browser Statistics

```json
{
  "browsers": {
    "Chrome": 198,
    "Firefox": 87,
    "Safari": 65,
    "Edge": 34,
    "Other": 12
  }
}
```

**Usage**: Browser breakdown
**Chart Ideas**:
- Bar chart of browser usage
- Browser trends over time

---

### 8. Referrer Statistics

```json
{
  "referrers": {
    "google.com": 87,
    "twitter.com": 23,
    "linkedin.com": 15
  }
}
```

**Usage**: Traffic sources analysis
**Chart Ideas**:
- Top referrers bar chart
- Referrer traffic over time

---

### 9. Unique Visitors

```json
{
  "uniqueVisitors": [
    "sess_1699627935_abc123",
    "sess_1699628012_def456"
  ]
}
```

**Usage**: Count unique sessions (not stored as individuals)

---

## API Endpoint Response

**GET** `/.netlify/functions/analytics-track`

Returns processed statistics:

```json
{
  "summary": {
    "totalPageViews": 396,
    "uniqueVisitors": 89,
    "totalPages": 24,
    "avgPagesPerSession": 4.5,
    "activeSessions": 12,
    "lastReset": "2025-11-10T20:30:00.000Z"
  },
  "topPages": [
    { "path": "/blog/post-1", "views": 45 },
    { "path": "/", "views": 42 }
  ],
  "topReferrers": [
    { "referrer": "google.com", "count": 87 }
  ],
  "browserStats": [
    { "browser": "Chrome", "count": 198 }
  ],
  "deviceStats": [
    { "device": "Desktop", "count": 234 }
  ],
  "dailyViews": [
    { "date": "2025-11-10", "views": 127 },
    { "date": "2025-11-11", "views": 98 }
  ],
  "hourlyViews": [
    { "hour": "2025-11-10 14", "views": 12 },
    { "hour": "2025-11-10 15", "views": 18 }
  ]
}
```

---

## Future Graph/Chart Implementation

### Recommended Libraries:

1. **Chart.js** (Recommended)
   - Simple, lightweight
   - Beautiful default styling
   - Good for basic charts
   - CDN: `https://cdn.jsdelivr.net/npm/chart.js`

2. **D3.js**
   - More complex, powerful
   - Fully customizable
   - Steeper learning curve

3. **ApexCharts**
   - Modern, responsive
   - Built-in interactivity
   - Good documentation

### Chart Ideas:

#### 1. Traffic Trends (Line Chart)
- X-axis: Last 30 days
- Y-axis: Page views
- Data: `dailyViews` array

#### 2. Hourly Heatmap
- X-axis: Hour (0-23)
- Y-axis: Day of week
- Color: View count
- Data: `viewsByHour` aggregated

#### 3. Device Breakdown (Pie Chart)
- Sections: Desktop, Mobile, Tablet
- Data: `deviceStats` array

#### 4. Browser Usage (Bar Chart)
- X-axis: Browser names
- Y-axis: Count
- Data: `browserStats` array

#### 5. Top Pages (Horizontal Bar)
- Y-axis: Page paths
- X-axis: View count
- Data: `topPages` array

#### 6. Traffic Sources (Donut Chart)
- Direct vs External referrers
- Data: `topReferrers` array

---

## Data Maintenance

### Automatic Cleanup:
- **Hourly data**: Keeps last 720 hours (30 days)
- **Sessions**: Purges inactive sessions older than 7 days
- **Page details**: Limits to 1000 most recent views per page

### Manual Purge:
**DELETE** `/.netlify/functions/analytics-track`
- Resets all data to empty
- Available via "Purge Data" button in admin UI

---

## Privacy & Performance

- **No cookies**: Uses sessionStorage only
- **No PII**: Only counts and aggregates
- **Respects DNT**: Honors Do Not Track
- **Excludes logged-in users**: Netlify Identity authenticated users are not tracked
- **Excludes admin area**: Admin pages (/admin/*) are never tracked
- **30-second cache**: Reduces Netlify Blobs API calls
- **Auto-cleanup**: Prevents unlimited growth
- **Netlify Blobs storage**: Persistent, doesn't trigger deploys
- **No rebuild triggers**: Page views don't cause site rebuilds

---

## Next Steps for Graphs

When ready to add visual charts:

1. Add Chart.js to admin analytics page
2. Fetch data from API endpoint
3. Create canvas elements for each chart
4. Initialize charts with appropriate data:
   - Line chart for `dailyViews`
   - Pie chart for `deviceStats`
   - Bar chart for `browserStats`
   - Horizontal bar for `topPages`

Example implementation ready on request!
