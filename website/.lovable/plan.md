

# Add 10 More Hindi & Marathi Blog Posts

## Overview
Expand from 10 regional posts (5 Hi + 5 Mr) to 20 regional posts (10 Hi + 10 Mr), bringing the total blog count to 40. New topics will target untapped vernacular search queries with authentic, region-specific content.

## New Hindi Posts (5)

6. **"दूध के दाम क्यों बढ़ रहे हैं — किसान, डेयरी और उपभोक्ता पर असर"** — Analysis of milk price economics in India, fodder costs, cooperative pricing, and how subscription models stabilize costs for families
7. **"घर पर दही, पनीर और घी बनाने की विधि — ताज़े दूध से"** — Practical recipe guide for homemade dairy products from fresh delivered milk, tied to subscription value proposition
8. **"दूध डिलीवरी बॉय कैसे बनें — कमाई, ज़िम्मेदारी और करियर गाइड"** — Career guide for delivery personnel, earnings potential ₹15-25K/month, app-based work, flexible hours
9. **"बच्चों के लिए दूध क्यों ज़रूरी है — बाल विशेषज्ञों की सलाह"** — Pediatric nutrition perspective on milk for children, calcium, protein needs by age, school milk programs
10. **"A2 दूध क्या है — फायदे, कीमत और कहां मिलेगा"** — Trending A2 milk topic, Gir cow breeds, health claims, availability through delivery apps

## New Marathi Posts (5)

6. **"दुधाचे दर का वाढतात — शेतकरी, डेअरी आणि ग्राहकांवर परिणाम"** — Milk pricing economics in Maharashtra, cooperative role, MSP for milk, consumer impact
7. **"घरच्या घरी दही, तूप आणि श्रीखंड बनवा — सोप्या पद्धती"** — Maharashtrian dairy recipe guide, cultural connection to homemade products from fresh subscription milk
8. **"दूध डिलिव्हरी बॉय म्हणून करिअर — कमाई, संधी आणि मार्गदर्शन"** — Career opportunity guide for delivery personnel in Pune/Mumbai metro areas
9. **"लहान मुलांसाठी दूध का महत्त्वाचे — तज्ञांचे मार्गदर्शन"** — Child nutrition and milk, traditional practices in Maharashtrian families, school nutrition programs
10. **"A2 दूध म्हणजे काय — फायदे, किंमत आणि उपलब्धता"** — A2 milk trend in Maharashtra, Gir/Sahiwal breeds, comparison with regular milk

## Technical Changes

### Files Modified

| File | Change |
|------|--------|
| `src/data/blogPostsHi.ts` | Append 5 new posts (ids hi-6 through hi-10) with 800-1200 word content each |
| `src/data/blogPostsMr.ts` | Append 5 new posts (ids mr-6 through mr-10) with 800-1200 word content each |
| `src/assets/blog/` | 10 new unique featured images (SVG-based colored illustrations) |
| `public/sitemap.xml` | Add 10 new blog post URLs |
| `public/llms.txt` | Add 10 new regional blog entries to the content index |

### No changes needed to:
- `blogPosts.ts` — already merges `...blogPostsHi, ...blogPostsMr` via spread
- `Blog.tsx` — language filter already works dynamically
- `BlogPost.tsx` — OG locale logic already handles `lang` field

### Content Standards
- 800-1200 words per post, authentic vernacular (not translated English)
- Region-specific references: local brands, cities, cooperatives, cultural practices
- Practical, actionable content with numbered steps and comparisons
- Unique author personas per language with consistent bios
- Each post gets a unique colored illustration as featured image

