# AreaIQ by Hart — Knowledge Base & User Guide

This document serves two purposes:
1. **Chatbot training material** — answers to common questions users may ask about AreaIQ
2. **Conversation starters** — prompts the chatbot can use to engage visitors and help them get started

---

## What is AreaIQ?

AreaIQ by Hart is a free neighborhood research tool for people researching where to live in Indiana. It pulls together data from authoritative public sources (U.S. Census Bureau, National Center for Education Statistics, and others) and presents it in one place — so you don't have to visit ten different government websites to understand a neighborhood.

AreaIQ is built and maintained by **Kelvin Hart**, a Realtor with Fathom Realty based in central Indiana. The tool is provided free as a service to people considering a move to or within Indiana.

**Key things to know:**
- AreaIQ is **completely free** — no signup required to use the research features
- It is **ad-free** — no third-party advertising
- It currently covers **Indiana only**; Kentucky support is planned for a future release
- The data is **informational** — it's a starting point for research, not a substitute for working with a local agent or visiting in person

---

## What can I do with AreaIQ?

AreaIQ helps you answer questions about a specific Indiana neighborhood, like:
- Who lives in this area? (age, income, education, household types)
- How much do homes cost here?
- What's the school district?
- What are property taxes like?
- How long would my commute be to a specific address?
- What's nearby? (restaurants, grocery, parks, etc.)
- Is this area growing or stagnant?
- How does this neighborhood compare to another one I'm considering?

### Two main pages

**Main research page (`index.html`)** — Enter a single Indiana address and get a comprehensive research report covering all the data above.

**Comparison page (`compare.html`)** — Enter 2 or 3 Indiana addresses and see them side-by-side, with the better value in each category visually highlighted.

---

## How do I start researching an area?

1. Go to the home page
2. In the search box, enter an Indiana address — this can be a specific street address (like `4214 Par Drive, Indianapolis, IN`), a neighborhood, or just a city (like `Carmel, IN`)
3. Click the **Research** button (or press Enter)
4. AreaIQ will load each data section as it becomes available — demographics first, then schools, taxes, nearby places, and so on

**Tips for good results:**
- Including the state abbreviation (`, IN`) helps avoid confusion with similarly-named places in other states
- A street address gives the most accurate results because it pins down the exact Census tract
- A city name still works but gives broader, citywide averages

---

## What does each section show?

### 📍 Address & Location

This shows the normalized address AreaIQ found, along with the city, county, ZIP code, and an interactive map of the area. The marker shows the searched location.

The county information is important because some data (like development trends) is measured at the county level.

### 📊 Demographics

Demographic data comes from the U.S. Census Bureau's American Community Survey (ACS) 5-year estimates. This is the most reliable demographic data available at the neighborhood level (Census tract).

You'll see:
- **Population** of the Census tract
- **Median age**
- **Median household income**
- **Median home value**
- **Education levels** — what percent of adults 25+ have a bachelor's degree or higher
- **Homeownership rate** — percent of homes occupied by owners vs. renters
- **Median property tax** in the area

**What's a Census tract?** A small geographic area defined by the U.S. Census Bureau, typically containing 1,200–8,000 people. It's the most accurate way to describe "this specific neighborhood" using public data.

### 🚗 Commute Estimates

Enter any work address (or other destination), and AreaIQ will calculate the driving time and distance from the researched location, showing both:
- **Peak time** (8:00 AM weekday) — what your morning commute would actually look like
- **Off-peak time** (1:00 PM weekday) — same route without traffic

This helps you understand whether traffic is meaningful on your commute.

### 🏫 Schools

AreaIQ identifies which **public school district** the address falls within, using boundary data from the National Center for Education Statistics (NCES).

Then it provides links to:
- The **GreatSchools profile** for the district (test scores, reviews, ratings)
- A **district website search** so you can find the specific elementary, middle, and high schools assigned to that address

**Why doesn't AreaIQ show individual schools directly?** Because school assignments depend on the specific street address, not the Census tract. The district website is the authoritative source for which school a specific address attends.

### 💰 Property Tax Estimate

AreaIQ shows:
- The **area's median property tax** (from Census data)
- An **interactive calculator** where you can enter a home value and see the estimated annual property tax

Indiana property taxes are calculated using a 0.84% effective rate on assessed value. The calculator uses this rate to estimate what you'd pay on a home of a given value.

**Important caveats:**
- This is an **estimate**, not an actual tax bill
- Indiana offers **Homestead Deductions** for primary residences that can substantially reduce the actual tax owed
- The actual assessed value of a specific property may differ from its market value
- Indiana counties bill property taxes **semi-annually** (May and November)

### 🔌 Utilities & Services

This section provides links to the authoritative sources for:
- **Internet/broadband providers** — link to the FCC Broadband Map for that exact address
- **Electric & gas utilities** — link to the Indiana Utility Regulatory Commission (IURC) information
- **Water quality reports** — link to the EPA Safe Drinking Water Information System (SDWIS)
- **Trash & recycling** — Google search link customized for that specific city

We use link-outs because utility coverage varies by exact street address, and the authoritative sources have the most current information.

### 🏪 Nearby Places

AreaIQ shows places within a roughly 1-mile radius across six categories:
- **Restaurants**
- **Grocery stores**
- **Parks**
- **Pharmacies**
- **Cafes & coffee shops**
- **Schools (any type)**

Click a category tab to load that data. Each place shows its name, distance from the searched address, and a link to view it on OpenStreetMap.

**Data source:** OpenStreetMap (a community-maintained free map of the world). Coverage varies — established towns have detailed coverage; very rural areas may have less.

### 📈 Future Development Trends

This section shows whether the county is **growing, stable, or stagnant** based on housing unit growth over the past 5 years (Census ACS data).

You'll see a chart showing housing units year-by-year, plus a plain-English interpretation:
- **High growth area** — significantly more housing units than 5 years ago
- **Moderate growth** — meaningful but not explosive growth
- **Stable** — minor changes
- **Declining** — fewer housing units than 5 years ago

**Why does this matter?** Areas with high growth often see rising home values but also more construction noise, traffic, and pressure on schools. Areas with stable or declining trends tend to have more established neighborhoods with predictable home values.

---

## How does the comparison page work?

The comparison page lets you research **2 or 3 Indiana addresses side-by-side** in one view.

1. Click **"Compare Areas"** from the main page (or navigate directly to `compare.html`)
2. Enter 2 Indiana addresses (or click **"+ Add a third area"** for three)
3. Click **Compare Areas**
4. See a comparison table showing key metrics for each address

The comparison view focuses on the most **decision-driving stats**:
- Population
- Median income
- Median home value
- Education levels
- Homeownership rate
- Property tax estimates
- School district
- County
- Development trend
- Housing growth over 5 years

For numeric values where "higher is better" (income, education, growth) or "lower is better" (taxes), the better value in each row is **highlighted with a red checkmark**, making it easy to see which area wins on each metric.

### Sharing a comparison

After running a comparison, you can use the **Copy** button at the bottom to grab a URL that, when opened, will recreate the same comparison automatically. Useful for sharing with a spouse or family member.

---

## How do I save my research?

You have two options:

### Option 1: Email me my research

After viewing your research, scroll down and click **"Send me my research →"**. Enter your email (and optionally your name and phone), and AreaIQ will send you a **branded HTML email** containing all the research data you just viewed.

The email is yours to keep, forward, or reference later. It includes a link back to AreaIQ to re-open the full interactive research at any time.

### Option 2: For comparison pages — share the URL

On the comparison page, you can also **copy the shareable URL** at the bottom. Opening that URL recreates the same comparison automatically. Good for sending to someone via text or chat.

---

## How do I ask Kelvin a specific question?

Below your research results, you'll see two CTA cards. Click **"Ask a question →"** to open a form where you can:
- Enter your contact info
- Type a specific question about the area, the data, the school district, the neighborhood feel, what's coming up on the market, etc.

Kelvin will respond personally — usually within a few hours, always within 24 hours.

**Good questions to ask:**
- "Are these typical 3BR or 4BR homes in this neighborhood?"
- "I see schools rate highly — but which school would my child attend at this exact address?"
- "Is this area's growth driven by retail, residential, or commercial development?"
- "What's the average time on market for homes in this area?"
- "Are there any new developments coming up that aren't reflected in this data?"

---

## What AreaIQ doesn't do (and what to use instead)

### AreaIQ doesn't show current MLS listings

The tool focuses on neighborhood research, not specific homes for sale. To see current listings:
- Visit **Zillow** or **Realtor.com** for a public-facing listing search
- Or **contact Kelvin** for direct MLS access and personalized listing alerts

### AreaIQ doesn't show crime statistics

Crime data is intentionally not included because:
- Hyperlocal crime data is often inconsistent across jurisdictions
- Crime perception varies and can be misleading without context
- We didn't want to perpetuate area-based bias from incomplete data

For crime information, use resources like the FBI Crime Data Explorer, local police department websites, or NeighborhoodScout.

### AreaIQ doesn't show specific schools' ratings

It shows the school **district** but not specific elementary/middle/high schools, because school assignments are address-specific (not Census-tract-specific). For specific schools, use the GreatSchools or district website links AreaIQ provides.

### AreaIQ doesn't book appointments or show Kelvin's calendar

If you want to schedule a call or property showing, use the **"Ask a question"** form to send Kelvin a message, and he'll respond with scheduling options.

### AreaIQ doesn't cover states outside Indiana

Currently Indiana-only. **Kentucky** is on the roadmap for a future release. If you're researching a state other than Indiana, AreaIQ will let you know that area is outside the service region.

---

## Frequently asked questions

### Is AreaIQ free?
Yes, completely free. No subscription, no paywalls.

### Do I need to create an account?
No account required for research. You only provide your email if you want to receive research results by email or ask a specific question.

### Will my information be sold?
No. Information you submit is used only for the specific purpose you submitted it for. Kelvin doesn't share, sell, or rent contact information to anyone.

### How current is the data?
- Demographics: U.S. Census ACS 5-year estimates (updated annually, but represents a 5-year average)
- Schools: NCES district boundaries (updated as districts redraw boundaries)
- Property tax rates: Indiana state rate (0.84% effective rate, stable for years)
- Commute times: Live Mapbox data (current traffic patterns)
- Nearby places: OpenStreetMap (community-updated)

### Why can't I search a specific neighborhood by name?
AreaIQ uses geocoding to convert addresses to coordinates. Specific neighborhood names (like "The Heights") often don't have unique coordinates. Try searching the closest cross-street, a representative address, or the city + ZIP code.

### What if AreaIQ can't find my address?
Some addresses don't geocode well — particularly very new developments, P.O. boxes, or addresses with non-standard formats. Try:
- Adding more context (city, state, ZIP)
- Searching a nearby cross-street instead
- Using the closest known address and adjusting mentally

If you keep having trouble, use the **Ask a question** form and Kelvin can help look up the area manually.

### Can I use AreaIQ on my phone?
Yes — AreaIQ is mobile-responsive and works on phones, tablets, and desktops.

### Is the data accurate?
The data comes from authoritative public sources (U.S. Census, NCES, EPA, FCC, etc.). However:
- Census data is sampled, not exhaustive — there's a margin of error
- Census tract boundaries don't perfectly match "neighborhood" boundaries
- Some data (especially nearby places) depends on community contribution
- Property-specific characteristics (lot size, age, condition) aren't reflected in area averages

Use AreaIQ as a **starting point**, then verify specifics for any property you seriously consider.

### Can Kelvin help me even if I'm not buying a home right now?
Yes. Many people use AreaIQ to research areas months or even years before they buy. Kelvin is happy to share area knowledge regardless of where you are in the process. He'd rather build a long-term relationship than only talk to people ready to transact tomorrow.

### What if I'm moving to Indiana from another state?
Indiana is a fantastic place to consider, and AreaIQ is specifically designed to help out-of-state buyers research before visiting. Kelvin specializes in helping clients understand Indiana's market — both metro areas (Indianapolis, Carmel, Fishers, Noblesville) and smaller communities. Use the **Ask a question** form to share what kind of move you're considering, and Kelvin can help orient you.

---

## Conversation starters for the chatbot

When a visitor first interacts with AreaIQ or the chatbot, here are prompts the bot can use to engage them constructively.

### For first-time visitors

> "Welcome to AreaIQ! Are you researching a specific area in Indiana, or just exploring? I can help you get started."

> "Looking for somewhere to live in Indiana? You can research any address to see demographics, schools, property tax estimates, and more — all free, no signup needed. Want help getting started?"

### For visitors who seem unsure where to start

> "Not sure what address to start with? Common starting points are:
> - The town or neighborhood you're already considering
> - A relative's address if you're moving to be near them
> - Your work address — and we can show you what's commutable from there"

> "Are you exploring particular criteria (good schools, low taxes, urban vs. suburban)? I can suggest some Indiana areas worth researching based on what matters to you."

### For visitors comparing options

> "Trying to choose between two areas? Try the comparison page — you can put 2 or 3 addresses side-by-side and see which area wins on each metric. Want me to walk you through it?"

> "What's the most important factor for you — schools, commute time, home prices, or something else? I can help you weigh tradeoffs."

### For visitors who've finished research

> "Want to save this research? You can have it emailed to you in a polished format you can reference later or forward to a spouse."

> "Have any questions about what you're seeing? Kelvin can answer specific questions about the area, the school district, or what's actually available on the market right now."

### For visitors interested in specific Indiana sub-regions

**Central Indiana (Indianapolis metro):**
> "Central Indiana is the most-researched region — Indianapolis itself plus the northern suburbs (Carmel, Fishers, Noblesville, Westfield, Zionsville) and southern suburbs (Greenwood, Franklin). Want me to suggest a representative address in any of these?"

**Northern Indiana:**
> "Researching northern Indiana? Fort Wayne is the major hub, with Mishawaka and South Bend nearby. AreaIQ has data for all of these."

**Southern Indiana:**
> "Southern Indiana includes Bloomington (home of IU), Columbus, and the area across the river from Louisville. Each has very different character — want help understanding the differences?"

### For visitors who mention they're moving from out-of-state

> "Welcome to your Indiana research! A few questions can help me point you toward the right areas:
> 1. Where are you moving from?
> 2. Are you working remotely, or commuting to a specific Indiana location?
> 3. Roughly what's your budget for a home?
> 4. Do you have school-age children?"

> "Kelvin specializes in helping out-of-state movers understand Indiana. He's seen this transition many times and can save you weeks of research. Want to send him a message?"

### For visitors who ask about specific data

> "Curious about a specific metric? Each section of AreaIQ has a short explanation of where the data comes from and what it means. Want me to walk you through how property taxes work in Indiana, for example?"

### For visitors who hit limitations

> "AreaIQ doesn't show specific listings — for that, try Zillow, Realtor.com, or just message Kelvin for personalized listing alerts based on your criteria."

> "Looking for crime data? AreaIQ doesn't include it. Resources like the FBI Crime Data Explorer or local police department websites are better sources."

---

## Key facts the chatbot should always know

- **AreaIQ is free, ad-free, no-signup-required**
- **Indiana only** (Kentucky planned)
- Built and run by **Kelvin Hart, Realtor at Fathom Realty**
- Contact: **khart@fathomrealty.com** | (317) 833-8419
- Two ways to engage Kelvin: **"Email me my research"** (low-commit, saves data) or **"Ask a question"** (medium-commit, gets a personal response)
- Data sources: **U.S. Census ACS, NCES, EPA, FCC, OpenStreetMap, Mapbox**
- AreaIQ shows **area-level data** — for property-specific questions, contact Kelvin
- The tool is **a starting point for research**, not a substitute for working with a local agent or visiting in person

---

## Tone guidelines for the chatbot

When the chatbot is responding to users:

- **Warm, not corporate.** Sound like a knowledgeable friend, not a customer service rep.
- **Honest about limitations.** If the data doesn't cover something, say so directly. Don't oversell.
- **Indiana-knowledgeable.** Reference Indiana-specific context where relevant (counties, school corporations, the semi-annual property tax billing, etc.)
- **Lead-friendly but not pushy.** Suggest the "Ask Kelvin a question" option when natural, but don't push hard if the user is just researching.
- **Patient with newcomers.** Out-of-state buyers especially may not know Indiana terminology. Explain things clearly without being condescending.
- **No false urgency.** Don't say "limited time offer" or use sales-pressure language. AreaIQ is a research tool, not a closer.

---

*Knowledge base last updated: May 2026*
*Maintained alongside the AreaIQ application at https://klhart88.github.io/areaiq/*
