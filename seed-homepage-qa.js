// Seed homepage general Q&As into the existing KB via API.
// Run after the service is live:
//   BASE_URL=https://gp-assistant-8o5q.onrender.com node seed-homepage-qa.js

const https = require('https');
const http  = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4242';
const url = new URL(BASE_URL);
const lib = url.protocol === 'https:' ? https : http;

const QA = [
  // The Basics
  { category: 'General — The Basics', question: 'What is GigPost?', answer: 'GigPost is a social media posting platform built for live music venues and the entertainers who perform at them. For venues, it automates your Facebook and Instagram posts for every show, special event, and house event. For entertainers, it helps venues promote your shows consistently — so more people actually show up.' },
  { category: 'General — The Basics', question: 'Who is GigPost for?', answer: 'GigPost serves two groups: venues (bars, restaurants, breweries, taverns, clubs, music venues) that book live entertainment and want to stay active on social media without it becoming a second job — and entertainers (bands, DJs, solo acts) who want their gigs promoted professionally every time they play.' },
  { category: 'General — The Basics', question: 'Who built GigPost?', answer: 'Three Connecticut musicians: Barry O\'Doherty (CEO), Becca O\'Doherty (Head of Client Success), and Michael Cleary (Director of Sales). Between them they\'ve spent decades playing the same rooms GigPost now serves. We built this because we\'ve had the conversation too many times — a great show, an empty room, and a Facebook page that hadn\'t posted in three weeks.' },
  { category: 'General — The Basics', question: 'Is GigPost just for Connecticut venues?', answer: 'No — GigPost works for venues and entertainers anywhere. We started in Connecticut because that\'s where our roots are, but the platform is built for any venue that books live entertainment.' },

  // For Venues
  { category: 'General — For Venues', question: 'What does GigPost do for my venue?', answer: 'It handles your social media for you. Every show you book becomes a polished, ready-to-post Facebook and Instagram graphic — with an auto-generated caption, your photos, and a schedule you set in advance. You stop staring at a blank screen the night before a gig and start showing up consistently where your customers are.' },
  { category: 'General — For Venues', question: 'What kinds of events does GigPost cover?', answer: 'Everything. Live bands, DJs, trivia nights, karaoke, comedy shows, open mics, happy hours, NFL Sundays, wine tastings — if you book it, GigPost can post it. The design flexes to fit any event type.' },
  { category: 'General — For Venues', question: 'How do I get my events into GigPost?', answer: 'Two ways: log into your portal and schedule everything at once, or text our GigPost SMS line when something comes up last-minute. Both create a polished post. Most venues use a mix of both.' },
  { category: 'General — For Venues', question: 'Will the posts look generic — like every other GigPost venue?', answer: 'No. The layout is consistent (that\'s intentional — it builds brand recognition over time), but the imagery, copy, and details are venue-specific. After a few weeks, your followers recognize your posts at a glance. Different venues post different things in their own voice — but each venue\'s posts stay visually unified.' },
  { category: 'General — For Venues', question: 'Can I use my own photos?', answer: 'Yes. Upload your venue shots, band photos, food — anything you have. If you don\'t have a photo for a specific event, GigPost generates one that fits the vibe. Most venues use a mix.' },
  { category: 'General — For Venues', question: 'How often will GigPost post to my page?', answer: 'You decide. Most venues run 2–4 posts per week — usually a "this weekend" announcement and a day-of-show reminder. You set how many days before each event we post, and we follow that schedule. You can adjust it any time in the portal.' },
  { category: 'General — For Venues', question: 'Does GigPost post to Instagram too?', answer: 'Yes. Every Facebook post can cross-post to Instagram automatically. One event → one design → both platforms at once. You link your Instagram during onboarding and it just works after that.' },
  { category: 'General — For Venues', question: 'What if I want to edit or cancel a post?', answer: 'Before a post goes live, edit or cancel it directly in the portal or text us to handle it. If something changes after a post already went out, GigPost can push an UPDATE post to your followers letting them know. That path is built in.' },
  { category: 'General — For Venues', question: 'Will my followers know the posts are automated?', answer: 'Mostly no. Single-event posts (a band on Saturday, a happy hour) come from your page with no GigPost branding — they look exactly like a post you made yourself. Weekly lineup recap posts carry a small "Powered by GigPost" mark. That\'s intentional: those are the posts we want other venues to discover us through.' },
  { category: 'General — For Venues', question: 'Can you guarantee more customers will come through the door?', answer: 'No — and be wary of anyone who makes that promise. What GigPost guarantees is a consistent, professional social presence that makes "real people seeing your shows" possible. Without consistent posting, you\'re invisible. GigPost fixes the invisible part.' },
  { category: 'General — For Venues', question: 'What happens to my Facebook page if I cancel GigPost?', answer: 'Nothing. You connect your page through Meta\'s official login — we never see your password and we don\'t own your page. If you cancel, we lose the ability to schedule posts. Everything we\'ve already published stays on your page and you keep full control.' },
  { category: 'General — For Venues', question: 'How long does onboarding take?', answer: 'About a 30-minute call. We set up your portal, walk you through how to use it, and dial in your venue\'s voice and posting style together. After that, you\'re running.' },

  // For Entertainers
  { category: 'General — For Entertainers', question: 'What does GigPost do for entertainers and bands?', answer: 'GigPost gives your venues a simple, automated way to promote your shows on social media. When a venue uses GigPost, every gig you play at that venue gets a polished Facebook and Instagram post — with your name, your photo, your details — without the venue having to remember to do it. More consistent promotion means more people in the seats when you play.' },
  { category: 'General — For Entertainers', question: 'Do I need my venue to be on GigPost for this to help me?', answer: 'For the venue-side posting, yes — GigPost posts through the venue\'s account. The venue books you, creates the event in GigPost, and the post goes out automatically. If your venues aren\'t on GigPost yet, the best thing you can do is let them know it exists.' },
  { category: 'General — For Entertainers', question: 'Is there a GigPost account just for entertainers and bands?', answer: 'Yes — the entertainer side of GigPost is launching alongside the full platform. You\'ll be able to claim your band profile, manage your info, connect your own Facebook and Instagram, and post about your upcoming shows yourself. Click "Get in Touch" at the bottom of the page if you want to get on the early access list.' },
  { category: 'General — For Entertainers', question: 'Can I make sure the information about my band is accurate on GigPost posts?', answer: 'When a venue books you through GigPost, they enter your details. If you notice something consistently wrong (name spelling, genre, photo), a quick note to the venue gets it fixed in their portal. The entertainer account lets you manage your own profile directly.' },
  { category: 'General — For Entertainers', question: 'What information does GigPost use to promote my shows?', answer: 'Act name, genre, photo (if available), date, time, and any event description the venue adds. The more detail the venue provides, the better the post.' },

  // Pricing
  { category: 'General — Pricing', question: 'How much does GigPost cost for venues?', answer: '$39/month — unlimited Facebook and Instagram posts, all event types, SMS posting line, full portal, and onboarding support. No per-post charges, no add-ons.' },
  { category: 'General — Pricing', question: 'Is there a free trial for venues?', answer: 'Yes — 30 days free, no credit card required upfront. After the trial it\'s $39/month. Cancel anytime, no contracts.' },
  { category: 'General — Pricing', question: 'What does "cancel anytime" actually mean?', answer: 'Month-to-month. If GigPost isn\'t working for you, say the word and you\'re done — no cancellation fees, no runaround. That said, social media usually takes a couple of months to gain traction, so we ask for a fair shot first.' },
  { category: 'General — Pricing', question: 'How much does the entertainer account cost?', answer: 'Free tier: claim and manage your band profile at no cost. Paid tier: $9/month with a 7-day free trial — full access to everything. Both tiers are available on the entertainer side of GigPost.' },

  // Privacy
  { category: 'General — Privacy', question: 'Is GigPost reviewing my followers\' data?', answer: 'Only what\'s required to schedule and verify posts. We\'re not data-mining your followers or building shadow profiles. Our Privacy Policy spells out exactly what we access and what we don\'t.' },
  { category: 'General — Privacy', question: 'Does GigPost have access to my Facebook password?', answer: 'Never. You connect through Meta\'s official login (OAuth) — the same method Facebook uses for every legitimate third-party app. We get permission to schedule posts; you keep full ownership of your page.' },

  // Getting Started
  { category: 'General — Getting Started', question: 'How do I sign up as a venue?', answer: 'Click "Start Free Trial" on this page. You can get started in a few minutes, and we\'ll set up a quick onboarding call to get you fully configured.' },
  { category: 'General — Getting Started', question: 'Is there a GigPost app?', answer: 'Yes — you can install GigPost to your phone\'s home screen in one tap. On iPhone: open mygigpost.com/portal in Safari → Share → "Add to Home Screen." On Android: open in Chrome → three-dot menu → "Install app." It works exactly like the website, just faster to launch.' },
  { category: 'General — Getting Started', question: 'I\'m in a band. How do I get started with GigPost?', answer: 'The entertainer side of GigPost is here. You can sign up for a free account to claim and manage your band profile, or go paid at $9/month for full access including your own social posting tools. Click "Get in Touch" at the bottom of this page if you have questions first.' },
  { category: 'General — Getting Started', question: 'How do I contact the GigPost team?', answer: 'Click "Get in Touch" at the bottom of this page to send us an email. We\'re a small team and we actually respond.' }
];

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = lib.request(opts, r => {
      let raw = '';
      r.on('data', c => raw += c);
      r.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function seed() {
  console.log(`Seeding ${QA.length} homepage Q&As to ${BASE_URL}...`);
  let ok = 0;
  for (const q of QA) {
    try {
      const res = await post('/api/qa', q);
      if (res.ok) { ok++; process.stdout.write('.'); }
      else console.error('\nFailed:', q.question, res);
      await new Promise(r => setTimeout(r, 80));
    } catch (e) {
      console.error('\nError:', q.question, e.message);
    }
  }
  console.log(`\nDone. ${ok}/${QA.length} seeded.`);
  console.log('\nNow run embed-all to index for semantic search:');
  console.log(`  curl -X POST ${BASE_URL}/api/embed-all`);
}

seed();
