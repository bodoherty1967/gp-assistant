# GigPost Portal — AI Assistant Knowledge Document
# Version 4 — Code-verified (Oct 13 2026, sources: codebase + merged PRs only)

## PURPOSE OF THIS DOCUMENT
This document is the authoritative knowledge base for the GigPost portal AI assistant. The assistant answers questions **only** about how the GigPost portal works. For anything outside portal functionality, the assistant should say: "I can only help with questions about using the GigPost portal."

---

## WHAT IS GIGPOST?

GigPost is a social media automation tool for bars and live music venues. It automatically creates and schedules posts to Facebook and Instagram whenever a venue books a live entertainer or runs a special event. Venues add their events once; GigPost handles writing captions, generating promotional images, and posting them on a timed schedule — without the venue having to log into Facebook each time.

**GigPost posts to:** Facebook Page and Instagram (Instagram connects through the same Facebook link — no separate Instagram login needed).

**Post formats available:**
- **Graphic** — a promotional poster image with the act name, date, venue, and show time
- **Reel** — a short video (10 seconds) with music, the act's photo, and text, posted as a Reel to Facebook and Instagram
- **Story** — posted to Facebook and Instagram Stories on the day of the show (part of Reach Mode only)

---

## GETTING STARTED

### Connecting Facebook
Before GigPost can post anything, connect your Facebook Page:

- Go to **Account & Settings → Facebook connection**
- Click **Connect Facebook**
- You'll be redirected to Facebook to log in and grant GigPost permission to post to your venue's Page
- Instagram connects automatically through the same Facebook link

If GigPost posts to Facebook but not Instagram, check the Instagram status row in Account & Settings. The most common cause is that the Instagram account isn't linked to your Facebook Page in Meta's settings.

### First-time setup checklist (Dashboard)
New accounts see a 3-step setup card on the Dashboard:
1. Connect Facebook
2. Add your first event
3. Review and schedule the posts

---

## DASHBOARD

The Dashboard is the home screen. It shows:

- **Facebook / Instagram connection status** chips
- **Health score tile** — 100-point score measuring how actively GigPost is working for your venue (see Health Score section below)
- **People reached, Reactions, Next post** stat tiles
- **KPI cards** — Scheduled Posts, Upcoming events, Entertainment costs, Avg. cost/show — filterable by Next 7 / 30 / 90 days or All time
- **Upcoming events** list — accordion cards that expand to show the posts scheduled for each event; filterable by timeframe

A red billing banner appears at the top if the trial is ending soon.

---

## CALENDAR

The Calendar shows a monthly grid of all your events.

- **Red dot** = posts scheduled (not yet posted)
- **Green dot** = posts published / posted
- **Green + red dot** = some posts published, more still scheduled
- **Grey dot / "Event only — no posts yet"** = event on calendar with no posts set up for it
- **Amber dot** = posts held — need your review before going out
- A recurring-event icon (circular arrows) marks events that repeat
- Click any day to see its events, or click an event chip to open the detail
- Click an empty day to add a new event on that date
- Use **← →** to navigate months; **Today** jumps back to the current month

The calendar legend at the bottom explains each dot colour.

---

## ADDING AN EVENT

Tap **+ Add Event** from the Dashboard, Calendar, or Posts tab. This opens the event creation wizard.

### Step 1 — Event details
- **Date** (required)
- **Start time** (required)
- **End time** (optional — tap × to clear)
- **Ticket link** (optional — must start with https://, no spaces)

### Step 2 — Pick your entertainer(s)

**Option A — Book a single act:**
Choose from your saved roster, or add a new entertainer on the spot.

**Option B — Lineup night (multiple acts):**
Add each act in order. You can set an individual stage time per act.

**Option C — House event:**
Instead of selecting an entertainer, enter a name like "Trivia Night", "Karaoke Night", "Open Mic Night", or "Comedy Night". The field offers autocomplete suggestions. GigPost generates a themed poster based on the event type (see House Event Designs below).

### Duplicate event check
If you start creating an event for an act already booked on the same date, GigPost will warn you before creating a second booking:
- **Open that event** — closes the wizard and opens the existing event, where you can tap Add a post from there
- **Create anyway** — continues making a new booking (useful if an act is genuinely playing two sets on the same night)
- **Cancel** — stays on the Event screen

### Step 3 — Create posts (post type, timing, and style)

On the Create posts screen, you choose:

**1. What are you posting?**
- **Graphic** — a promotional poster
- **Reel** — a short video with music (if Reels & Stories is enabled on your account)
- **Reach Mode** — all three: a Graphic 7 days before the show, a Reel 3 days before, and a Story on the day of the show

**2. When should posts go out?**
Choose which days before the show to post. Your account's default schedule is pre-selected. Options include: 14 days before, 10 days before, 7 days before, 5 days before, 3 days before, Day before, Day of show. You can select multiple.

**3. Choose a poster style (or reel style)**
- For Graphics: a grid of 8 poster styles. Pick the one you want.
- For Reels: a grid of reel style options, each previewed with your event's own photo.
- For Reach Mode: you pick both a poster style (for the Graphic) and a reel style (for the Reel).
- If you have multiple posts, each can have its own style. "Same style for all posts" starts unchecked — tap a style to apply it to the currently selected post, or check the box to apply one style to all.

### Step 4 — Review and schedule
Every post is shown before anything goes out — image (or reel preview), AI-written caption, platform, and scheduled send time. You can:
- Edit the caption directly
- Regenerate the caption (AI writes a fresh version)
- Swap or regenerate the image
- Change the scheduled date and time
- On mobile: tap any post in the list to see its full preview below the list
- Hit **Schedule** to confirm and queue all posts
- **Post Now** sends immediately

### Recurring events
When adding an event you can set it to repeat (weekly, every 2 weeks, monthly, etc.). You can later edit a single occurrence or all future ones. To stop the series, open the event and choose **Stop Recurring** — with or without posting a cancellation notice to your page.

---

## POST FORMATS — GRAPHIC, REEL, AND REACH MODE

### Graphic
A promotional poster image. GigPost composites the act's photo (or an AI-generated background) with the venue name, act name, date, and show time. You choose from 8 poster styles.

### Reel
A short (~10 second) video post. GigPost renders the reel from the act's photo, adds animated text (act name, venue, date), and attaches a music soundtrack matched to the genre. Reels are posted to Facebook Reels and Instagram Reels.

- You choose a reel style from a grid — each tile is previewed with your event's actual photo
- Text is positioned inside Meta's safe zone so it isn't covered by Facebook's or Instagram's own UI (like the account header, caption bar, or share rail)
- The reel renders before you schedule it, so you can see exactly what will post
- An event can have **multiple reels** — each added via "Add a post" with its own photo and style

### Reach Mode
Reach Mode posts all three formats for one event:
- **Graphic** — 7 days before the show
- **Reel** — 3 days before the show
- **Story** — on the day of the show

You choose a poster style for the Graphic and a reel style for the Reel. The Story uses the reel video.

**Rules:**
- An event can only have one Reach Mode — once it has a reel or story, Reach Mode can't be added again (you can still add more Graphic or Reel posts)

---

## HOUSE EVENT DESIGNS

When you create a House Event (no act booked) and the name contains "Trivia", "Karaoke", "Open Mic", or "Comedy" (or similar), GigPost offers a **Poster design** grid on the Create posts screen.

You'll see 6 themed designs specific to that night type — for example, trivia nights get question-mark tile backgrounds, comedy nights get neon or bold graphic styles. Each tile is rendered with your venue's actual name, date, and time.

- Pick a design to use it as your poster
- The design is stored per event — if you edit the event later, it stays
- If you rename the event to a different night type, the design grid updates to match
- Your own uploaded photo always takes priority over a themed design
- If the event name doesn't match one of the four types, GigPost uses the standard poster

---

## EVENT DETAIL — What You Can Do on an Existing Event

Click any event on the Calendar or Dashboard to open its detail panel. From here:

- **Edit event** — change the entertainer, date, time, notes, or other details
- **Edit posts** — modify existing scheduled posts for this event (change caption, image, timing)
- **Add a post** — add a brand-new additional post to this event with its own photo, style, and schedule
- **Create posts** — appears if the event is on your calendar but has no posts scheduled yet
- **Delete** — removes the event and its posts
- **Check** — appears when one or more posts are held for review (see Held Posts below)

### Adding a Post to an existing event

You can add additional posts to an event at any time, each with its own photo, poster style, and schedule.

**To add a post:**
1. Open the event from your Calendar or Dashboard
2. Tap **Add a post**
3. Choose the post format: **Graphic**, **Reel**, or **Reach Mode** (if Reels & Stories is enabled)
4. Choose a photo and poster or reel style for this new post
5. Pick a timing chip (days already taken by existing posts are locked and can't be reused)
6. Preview the post, set the schedule, and confirm

**About adding Reels:**
- You can add multiple Reel posts to one event — each is its own video with its own photo and reel style
- Once an event has any reel or story, Reach Mode can't be added — you can still add more Graphic or Reel posts

**Limitations:**
- Not available for past events (the show date has already passed)

### Held posts

If you edit an event (date, time, or act name), GigPost redraws any affected scheduled posts. While they're being redrawn, the posts are held in **Needs review** status and will NOT go out until you approve them. A yellow notice appears on the event with a **Check** button — tap it to review the redrawn posts and approve or reject each one. You can see the new version versus the old poster with a toggle switch.

---

## POSTS TAB

Every post GigPost has created or scheduled lives here.

### Filtering and sorting
- **Status:** All / Scheduled / Published
- **Platform:** All / Facebook / Instagram
- **Date range:** custom from/to filter
- **Sort:** Newest first, Oldest first, Most reached, Most reactions, Most clicks, Best engagement
- **View:** List, Grid, or Grouped

### Grouped view
The **Grouped** view (third icon in the view toggle) organises posts by event or recurring series:
- Each group has a header showing the event name, schedule (e.g. "Every Thursday"), post count, and status badges
- Click the chevron to expand or collapse a group
- The first upcoming scheduled post in each group gets an orange highlight
- A search bar at the top lets you filter groups by event name, schedule, or caption text
- 4 posts show per group by default — tap "Show N more" to expand inline

### Editing a post
Click any post card. From there you can:
- Edit the caption directly
- Regenerate the caption (AI writes a fresh version)
- Swap or regenerate the image
- Change the scheduled date/time
- Delete the post

### Deleting a published post
GigPost will delete the post from Facebook and (if connected) Instagram. The confirm dialog tells you exactly which platforms it will delete from:
- If Instagram is fully connected with the right permissions, it deletes from both
- If Instagram permissions need updating (you'd need to reconnect), it tells you and deletes from Facebook only — you'll need to remove it from Instagram manually
The deletion can't be undone.

### New Post (not tied to an event)
Use **+ New post** (or the Quick Post entry) to create a standalone post for anything that isn't a booked event. Three types:
- **Image Post** — describe what it's about, GigPost generates or pulls a photo and writes a caption
- **Video** — upload a video (MP4 or MOV, up to 90 seconds) or choose from your library; GigPost writes a caption
- **Color Card** — your own words on a solid coloured background, no photo needed

---

## ENTERTAINERS TAB

Your saved roster of acts.

### What's stored per entertainer
- **Name** (required)
- **Type** (required) — one of: Live Band / Artist, Solo Musician, DJ, Comedian / Stand-Up, Karaoke Host, Trivia Host / Company, Other
- **Genre** (optional) — free text, e.g. "Folk", "Classic Rock", "Celtic"
- **Bio** (optional) — used by GigPost's AI to write captions. A few sentences about the act, their style, and what crowds love
- **Promo photos** (optional, up to 5) — used as the event poster image
- **Contact details** (optional) — contact name, phone, email
- **Links** (optional) — website, Facebook page, Instagram

The act type and genre directly affect how GigPost writes captions — a DJ gets different copy from a comedian or a cover band.

### Adding an entertainer
Click **+ Add Entertainer**. As you type the name, GigPost searches its band database and suggests matches — tap a suggestion to pre-fill genre and bio automatically.

### Sorting and searching
- Sort **A–Z** or by **Top Rated** (acts with highest ratings)
- Search by name, genre, or act type

### Rating an act
After a show, GigPost prompts you to rate the act (via notification the day after). Ratings help sort your roster and improve the Health Score.

### Emailing an entertainer
Open an entertainer's profile and tap **Email** to send a message directly from the portal.

### Building your roster with the scanner
Tap **Find acts from posts** — GigPost scans your Facebook posts, website, and web search results to suggest acts to add to your roster. Sources: your venue website, web search results, and your last 12 months of Facebook posts (if connected). Suggested acts can be added with one tap.

---

## SPECIALS TAB

Promote food and drink deals — Happy Hour, Taco Tuesday, Wing Night, etc.

### Two ways to create a special

**Build it for me:**
- Enter a name (e.g. "Taco Tuesday") and optional headline (e.g. "All for $11")
- Add menu items — one row per item, name and optional price
- GigPost designs a themed poster and writes the caption

**Use my own graphic:**
- Upload your finished image (JPG, PNG, HEIC)
- Add a short description of the special (up to 400 characters, used for the caption only — never alters your graphic)
- GigPost posts the image as-is and writes the caption from your description

### Schedule
- **Recurring** — runs on the same day(s) every week
  - Pick one or more days using the **Sun–Sat chip picker** — tap any day chip to select it (you can select multiple, e.g. Tuesday and Thursday)
  - Set start date and optional end date
  - The posting hint updates to show the schedule, e.g. "Posts every Tuesday & Thursday"
- **One-time** — runs on a specific date only

### Managing specials
- Filter by All / Recurring / One-time
- Search by name or headline
- Tap a special to edit or delete
- Editing the days, times, or schedule of a special will redraw the poster to reflect the new schedule

---

## ACCOUNT & SETTINGS

### Facebook connection
Connect or reconnect your Facebook Page. If the connection expires, reconnect here. Instagram is connected automatically through the same Facebook link.

### Venue profile
- Edit venue name, address, phone, and website
- **Changing your email** sends a confirmation link to the new address — it takes effect once you click that link

### My Vibe
Set your venue's caption tone and voice so GigPost writes posts that sound like you.

- **Caption Tone** — choose from:
  - No preference (GigPost decides)
  - Professional & polished
  - Casual & laid-back
  - Energetic & hype
  - Warm & neighbourhood pub
  - Edgy & bold
- **Tell us how you talk to your crowd** — a free-text box where you describe your voice, style, and anything GigPost should (or shouldn't) say. For example: "We're a neighbourhood sports bar. Keep it fun and friendly. Always mention drink specials if there are any."
- **✨ Generate from my website** — click this and GigPost reads your venue's website and drafts voice notes for you automatically. You can then edit the draft before saving.

Changes take effect on the next AI caption generated.

### Visual Identity
Set your brand colours, logo, and poster style. GigPost uses these on every poster and lineup board it creates.

- Upload your logo (shown on posters when the logo toggle is on in the event wizard)
- Set your brand colours (primary and accent)
- Toggle on/off with a switch — a live preview updates as you make changes
- **Logo placement:** when you turn on the logo toggle for an event, a placement modal opens so you can drag the logo to exactly where you want it, resize it with a slider, or snap it to one of 9 quick-position points (3×3 grid). Each event can have its own logo position.

### Posting defaults
- **Default post time** — the time of day your posts are sent
- **Default schedule** — which days before the show to post. Options (multiple can be selected): 14 days before, 10 days before, 7 days before, 5 days before, 3 days before, Day before, Day of show

### Lineup settings
- **Weekly lineup** — automatically post a lineup board for the coming week. Set the day of the week and time.
- **Monthly lineup** — automatically post a monthly lineup board. Set the day of the month and time.
- **Share to GigPost community page** — optionally share your weekly lineup to the GigPost community Facebook page for extra exposure. On by default; can be turned off.
- Template style pickers for both weekly and monthly lineups

### Notification preferences
Turn notifications on or off. Choose delivery method: **Email**, **Text (SMS)**, or **Both**. SMS requires agreeing to terms.

Notification types available:
- **Posting problems** — alerts when a post fails (on by default, can't be turned off)
- **Post went live** — when a scheduled post is published to Facebook
- **Rate your act** — the day after a show with no rating saved
- **Weekly lineup posted** — when your weekly lineup goes out
- **Monthly lineup posted** — when your monthly lineup goes out
- **Make it a Facebook Event** — reminder after a post goes live to create a Facebook Event for the show

### Subscription & billing

Two plans:

**GigPost Self-Serve — $99/month**
- Includes a one-time setup fee of $199
- During the free trial, no charge. On day 30, $298 is charged ($99 first month + $199 setup fee as one combined invoice). Monthly $99 from then on.

**GigPost Concierge — $249/month**
- Setup is included in the monthly price (no separate setup fee)

Both plans start with a **30-day free trial** (no charge during trial).

Subscription status and trial end date are shown in **Account & Settings → Subscription**.

- **Subscribe · $99/mo** button appears if you haven't subscribed yet
- **Manage subscription** opens Stripe's billing portal to update your card, cancel, or reopen a cancelled plan
- Cancelling during a trial: posting stops at end of trial, you won't be charged
- Cancelling an active subscription: access continues until the end of the billing period
- There is also a **View other plans** option to compare Self-Serve vs Concierge

---

## LINEUP BOARDS

GigPost can automatically post weekly and monthly lineup boards — summary images showing all your upcoming acts.

### Weekly lineup
- A graphic showing all acts booked for the coming week, with names, days, and times
- Lineup Nights (multiple acts) show each act individually with their own name and set time
- Style options: Photo Grid, Photo Stack, Classic Grid, Chalkboard Grid, Photo List — each available in Account & Settings
- Post automatically on a day/time you set, or post now from Account & Settings

### Monthly lineup
- A monthly grid view showing all acts across the month
- Lineup Nights expand to show every act in the night, each with their own photo and time
- Post automatically on a day of the month you set, or post on demand

### Community page sharing
Your weekly lineup can be shared to the GigPost community Facebook page for extra exposure. Toggle on/off in Lineup settings.

---

## HEALTH SCORE

The Health Score (shown on the Dashboard) is a 100-point measure of how actively GigPost is working for your venue. It has five components:

1. **Posting Consistency (30 pts)** — How many posts in the last 30 days vs. your expected volume (based on your weekly event count setting)
2. **Entertainer Engagement (20 pts)** — How consistently you're booking entertainers
3. **Lineup Posts (25 pts)** — Whether your weekly and/or monthly lineup boards are being posted
4. **Event Ratings (15 pts)** — How many of your past shows you've rated
5. **Post Engagement (10 pts)** — Real Facebook performance data (reach, reactions, clicks)

Each component shows a tip explaining how to improve it. If your venue profile isn't complete (weekly event count not set), some scores show as locked until that's filled in.

---

## HOW POSTING WORKS

When you add an event and approve the posts:
1. Posts are scheduled at the times you set (or the default schedule)
2. GigPost posts to Facebook and Instagram at the scheduled time
3. The post appears in the Posts tab as "Published" with a link to the live post
4. Performance data (reach, reactions, clicks) is pulled from Facebook/Instagram and shown in the Posts tab

**You always approve before anything posts.** GigPost never sends a post without you previewing it first.

---

## HOW CAPTIONS WORK

GigPost writes captions using AI. The AI uses:
- The entertainer's bio
- Their genre and act type (DJ, comedian, cover band, etc.)
- The venue name and your My Vibe settings (tone and voice notes)
- The event date and time
- The ticket link (if provided)
- For specials: the menu items and/or description

**My Vibe affects all captions.** If you've set a caption tone or written voice notes in Account & Settings, every new caption GigPost writes reflects that style.

**Regenerating:** Hit Regenerate on any post to get a fresh AI-written version. Unlimited regenerations.

**Editing:** You can always edit the caption manually before scheduling.

---

## HOW IMAGES WORK

GigPost uses the act's uploaded promo photos when available. If none are uploaded, it generates an AI background image styled to the genre and act type.

For **Lineup Nights**, GigPost creates a lineup board showing all acts and their stage times.

For **House Events** (Trivia Night, Karaoke Night, Open Mic, Comedy Night), GigPost uses themed poster templates. If the event name matches one of these types, you'll see a design picker with 6 options.

If **Visual Identity** is set up with your brand colours and logo, GigPost composites your logo onto posters (at the position you set in the logo placement modal).

For **Reels**, GigPost renders a short video from the act's photo with animated text and a music soundtrack.

---

## HOW REELS WORK

A Reel is a short (~10 second) video post, rendered specifically for your event.

- **What it looks like:** the act's photo fills the screen, text animates in (act name, venue, date), and a music soundtrack plays underneath
- **Style picker:** you choose the visual style from a grid — each tile is rendered with your event's actual photo so you see exactly what it will look like before committing
- **Safe zone:** all text is positioned within Meta's safe zone so nothing is covered by Facebook's or Instagram's navigation overlays, captions bar, or share buttons
- **Soundtrack:** GigPost picks a music track appropriate to the genre. You don't choose the specific track, but the style you pick determines the mood
- **Rendering:** the reel is rendered before you hit Schedule, so you always preview the real video
- **Multiple reels:** you can add more than one reel to an event using Add a post — each has its own photo and style, and is its own video file

### Reach Mode timing
In Reach Mode, the three posts go out on a fixed schedule relative to the show date:
- Graphic post: 7 days before
- Reel: 3 days before
- Story: day of the show

---

## COMMON QUESTIONS

**Q: Why isn't my post going to Instagram?**
A: Instagram posts through your Facebook connection. Check Account & Settings → Instagram status. If disconnected, your Instagram account may not be linked to your Facebook Page in Meta Business Settings. Go to Meta's Business Settings, link the Instagram account to your Page, then reconnect in GigPost.

**Q: Can I post to multiple Facebook Pages?**
A: No — GigPost connects to one Facebook Page per account. If you manage multiple venues, each venue needs its own GigPost account.

**Q: How do I change the image on a scheduled post?**
A: Open the post from the Posts tab or from the event detail. Tap the image to swap it — you can choose from the act's promo photos, upload your own, or let GigPost regenerate one.

**Q: Can I edit a caption after it's been scheduled?**
A: Yes. Open the post and edit the caption directly. Save your changes — the scheduled post will go out with the updated caption.

**Q: Can I edit a caption after it's already been published to Facebook?**
A: No — GigPost can't edit a post that's already live on Facebook. You would need to edit it directly in Facebook.

**Q: A post went out with an old caption / wrong image. What happened?**
A: If you edited an event (changed the date, time, or act name), GigPost redraws affected posts and holds them for your review. If those held posts weren't approved, they were sent as-is. Always check the yellow "Needs review" notice after editing an event and approve the redrawn versions before the scheduled send time.

**Q: What's the difference between a Reel and a Graphic?**
A: A Graphic is a still promotional poster image. A Reel is a short video (~10 seconds) with animation and music. Both are posted to Facebook and Instagram. Reels generally get higher reach because both platforms promote video content. If your account has Reels & Stories enabled, you can choose the format when creating posts.

**Q: What is Reach Mode?**
A: Reach Mode schedules three posts for one event: a Graphic poster 7 days before the show, a Reel 3 days before, and a Story on the day of the show. It's designed to build awareness leading up to the event. You choose one poster style and one reel style, and GigPost handles the rest.

**Q: Can I add a Reel to an event that already has a Graphic post?**
A: Yes. Open the event and tap Add a post. If Reels & Stories is enabled, you'll see Graphic, Reel, and Reach Mode options. You can add a Reel at any available timing chip. Each event can have multiple Reels — each is its own video.

**Q: Can I add Reach Mode to an event that already has posts?**
A: Only if the event doesn't already have a reel or story. Once any reel or story is associated with an event, Reach Mode is no longer available — but you can still add Graphic or Reel posts individually.

**Q: Why is a timing chip greyed out when I'm adding a post?**
A: That day already has a post scheduled for this event. GigPost doesn't allow two posts at the same timing. Choose a different day.

**Q: I created an event for an act but they're already on my calendar for that date. Will it post twice?**
A: GigPost warns you before creating a second booking. Choose "Open that event" to go to the existing event — from there you can tap Add a post to add another promotional post to it. If the act is genuinely playing two separate sets, choose "Create anyway" to make a new booking.

**Q: What does "Needs review" mean?**
A: When you edit an event's date, time, or act name, GigPost redraws the affected posts. While redrawing, those posts are held and marked "Needs review." They will not go out until you review and approve them. Open the event and tap Check to see the redrawn versions and approve or reject each one.

**Q: What's the Health Score and how do I improve it?**
A: The Health Score is a 0–100 rating of how actively GigPost is working for you. It considers: how consistently you're posting (30 pts), how often you're booking acts (20 pts), whether you're running weekly/monthly lineups (25 pts), how many past shows you've rated (15 pts), and actual engagement from Facebook (10 pts). Tips for each component appear next to the score on the Dashboard.

**Q: How do I set up a recurring event?**
A: When creating a new event, there's a recurring option where you set the frequency (weekly, every 2 weeks, monthly, etc.) and start/end dates. Each occurrence generates its own posts on the same schedule. You can edit a single occurrence or all future ones from the Calendar.

**Q: How do I stop a recurring event?**
A: Open any occurrence of the event and choose Stop Recurring. You can choose to post a cancellation notice or stop silently.

**Q: Can I change the days before the show that GigPost posts?**
A: Yes — in two ways. For a specific event, you choose the timing chips on the Create posts screen. For all future events, go to Account & Settings → Posting defaults and update the Default schedule. Changing the default doesn't affect events already scheduled.

**Q: What is My Vibe and how does it affect my posts?**
A: My Vibe is in Account & Settings. It lets you set a Caption Tone (Professional, Casual, Energetic, etc.) and write voice notes that tell GigPost how you talk to your crowd. GigPost uses both to write captions that sound like you. You can also tap "✨ Generate from my website" and GigPost will read your venue's website and draft voice notes automatically.

**Q: Can I change the poster style after scheduling?**
A: Yes. Open the post from the Posts tab or event detail, tap the image, and choose a different style. GigPost will redraw the poster with the new style. The change applies only to that post — other posts on the event are not affected.

**Q: Can I use my own logo on posters?**
A: Yes. Upload your logo in Account & Settings → Visual Identity and turn on the logo toggle. When creating an event, you'll see a logo placement modal where you can drag the logo to the position you want, resize it, or snap it to a preset location. Each event can have its own logo placement.

**Q: How do I post a food or drink special?**
A: Go to the Specials tab and tap + Add Special. Choose "Build it for me" to enter items and let GigPost design the poster, or "Use my own graphic" to upload your own image. You can schedule it to post once or recurring on specific days each week. For recurring specials, you can select multiple days — for example Tuesday and Thursday.

**Q: Can a recurring special post on multiple days of the week?**
A: Yes. When setting up a weekly recurring special, you can select any combination of days using the Sun–Sat chip picker. For example, you can set a Happy Hour special to post every Wednesday and Friday.

**Q: How do I delete a post from Facebook?**
A: Open the post in the Posts tab, scroll down to the actions, and tap Delete post. GigPost will delete it from Facebook. If your account has the right Instagram permissions, it will also delete from Instagram — the confirm dialog will tell you exactly which platforms it will affect before you confirm.

**Q: The weekly lineup board shows the wrong acts / isn't including all my acts. What's wrong?**
A: The weekly lineup is generated based on events booked for the coming week. Make sure all your events are entered in GigPost before the lineup posts. If an act isn't showing up, check that the event is on the calendar for the correct date and that Create posts has been completed for that event.

**Q: My lineup board is only showing one act from a Lineup Night. Is that a bug?**
A: This was a bug that's now fixed. Monthly and weekly lineup posters now show every act in a Lineup Night, each with their own name, time, and photo. If you're still seeing one act, try posting the lineup again.

**Q: How do I set up a weekly or monthly lineup board?**
A: Go to Account & Settings → Lineup settings. Turn on weekly or monthly lineup, choose the day of week (or day of month) and time you want it to post. GigPost will generate and post the lineup automatically. You can also choose a style template for the board.

**Q: What is the Grouped view in the Posts tab?**
A: Grouped view is a third way to see your posts (alongside List and Grid). It organises posts by event or recurring series — so all the posts for "Dana Cole — Fridays" collapse into one group. Click the chevron to expand a group and see individual posts. It's the easiest way to find a specific post in a recurring series or audit the graphics across an event.

**Q: I edited my event and now the posts say "Needs review". Can they still go out on time?**
A: Yes, as long as you review and approve them before their scheduled send time. Open the event, tap Check, and approve each redrawn post. If you don't review them in time, they'll be held until you do — they won't go out unapproved.

**Q: Can I add a new post to an event that's already been created?**
A: Yes. Open the event from the Calendar or Dashboard and tap Add a post. You can add a Graphic, Reel, or Reach Mode post at any timing that isn't already taken. This is useful if you want to promote an event more heavily as the show date approaches.

**Q: I started adding an event and it told me the act is already on my calendar. What should I do?**
A: GigPost detected that you're booking the same act on the same date twice. Choose "Open that event" to go back to the existing event — from there, tap Add a post if you want to schedule another post for it. If the act really is playing two separate sets that night, choose "Create anyway" to make a separate booking.

---

## WHAT THE ASSISTANT CANNOT HELP WITH

The GigPost Assistant can only answer questions about using the portal. For the following, please contact GigPost support:

- **Account-specific issues** — billing problems, subscription errors, missing data
- **Facebook or Instagram account issues** — reconnecting Facebook, permission errors from Meta
- **Technical errors** — posts failing to publish, images not generating
- **Cancelling or changing your plan** — contact support or use the Stripe billing portal link in Account & Settings
- **Refunds or billing disputes**
- **Questions about the GigPost Concierge service** — what's included, how to sign up

For anything the assistant couldn't help with: **support@mygigpost.com**
