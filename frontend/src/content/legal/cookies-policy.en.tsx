// frontend/src/content/legal/cookies-policy.en.tsx
//
// Cookies Policy — kept in sync with the cookies and local storage the Site
// ACTUALLY uses. If you add, remove or change a cookie / analytics tool, update
// the "Cookies used on this Site" table below. To add a translation, copy this
// file to `cookies-policy.<locale>.tsx`.

import type { LegalDoc } from "./index";

const doc: LegalDoc = {
  title: "Cookies Policy",
  subtitle: "What they are · which we use · how you can control them",
  updated: "Last updated 8 June 2026",
  intro: [
    "This Cookies Policy explains what cookies are, which cookies and local storage the website www.lumebymark.com (the “Site”) uses, and how you can manage them. It supplements the Privacy Policy and the Terms of Use available on the Site.",
  ],
  sections: [
    {
      id: "what-cookies-are",
      heading: "What cookies are",
      blocks: [
        {
          type: "p",
          text: "A cookie is a small text file that is automatically placed on your device — computer, tablet or mobile phone — when you access certain websites. The cookie allows the Site to identify your browser and to store information that makes it possible, for example, to remember your preferences and to analyse the use of the Site so as to improve it.",
        },
        {
          type: "p",
          text: "Cookies do not, in themselves, grant access to personal information stored on your device, nor do they install harmful software. Alongside cookies, the Site also uses your browser’s local storage for a limited functional purpose, as described below.",
        },
      ],
    },
    {
      id: "types-of-cookies",
      heading: "Types of cookies",
      blocks: [
        {
          type: "p",
          text: "Cookies may be classified by their lifespan — session cookies (deleted when you close the browser) or permanent cookies (which remain until they expire or you delete them) — and by their origin — own cookies (set by LumeByMark) or third-party cookies (set by another entity). By purpose, they are commonly grouped as follows:",
        },
        {
          type: "list",
          items: [
            "Strictly necessary cookies — essential to the functioning of the Site; they do not require your prior consent.",
            "Functionality cookies / storage — remember your choices (for example, the language of the interface).",
            "Analytical cookies — measure the use of the Site in aggregate terms to help us improve it; loaded only after you accept analytical cookies.",
            "Marketing cookies — present advertising tailored to your interests. The Site does not currently use marketing cookies.",
          ],
        },
      ],
    },
    {
      id: "cookies-used",
      heading: "Cookies used on this Site",
      blocks: [
        {
          type: "p",
          text: "The Site uses the cookies indicated in the table below. This list is updated whenever relevant changes are introduced.",
        },
        {
          type: "table",
          columns: ["Name", "Type", "Purpose", "Duration"],
          rows: [
            [
              "lume_cookie_consent",
              "Strictly necessary · own",
              "Records your choice in the cookie banner (accepted or declined) so it is not shown again on every visit.",
              "12 months if accepted · 30 days if declined",
            ],
            [
              "_ga",
              "Analytical · third-party (Google Analytics)",
              "Distinguishes visitors to produce aggregated usage statistics. Set only after you accept analytical cookies.",
              "24 months",
            ],
            [
              "_ga_*",
              "Analytical · third-party (Google Analytics)",
              "Persists the session state for the Google Analytics property. Set only after you accept analytical cookies.",
              "24 months",
            ],
          ],
        },
        {
          type: "p",
          text: "Google Analytics is provided by Google Ireland Limited. Its cookies are loaded only if you accept analytical cookies in the cookie banner; if you decline, they are not used. This table is indicative and may be updated in accordance with the analytical tools in use at any given time.",
        },
      ],
    },
    {
      id: "local-storage",
      heading: "Local storage",
      blocks: [
        {
          type: "p",
          text: "In addition to cookies, the Site stores one item in your browser’s local storage for a functional purpose. Local storage is not a cookie and is not transmitted to our servers; it remains on your device until you clear it.",
        },
        {
          type: "table",
          columns: ["Name", "Type", "Purpose", "Duration"],
          rows: [
            [
              "lume_locale",
              "Functionality · own (local storage)",
              "Remembers the language you selected for the interface so it is applied on your next visit.",
              "Until cleared by you",
            ],
          ],
        },
      ],
    },
    {
      id: "managing-cookies",
      heading: "Management of cookies by the User",
      blocks: [
        {
          type: "p",
          text: "On your first visit, an information window (cookie banner) lets you accept or decline the cookies that are not strictly necessary. You can change your decision at any time by:",
        },
        {
          type: "list",
          items: [
            "Clearing the cookies and local storage stored by the Site, which will cause the cookie banner to be shown again;",
            "Configuring your browser’s preferences to accept, refuse or delete cookies by default or by category;",
            "Manually deleting the cookies already stored on your device.",
          ],
        },
        {
          type: "p",
          text: "The configuration of cookies varies according to the browser used; for detailed instructions, consult your browser’s official documentation or the website www.allaboutcookies.org. Please note that blocking cookies and local storage may partially or fully condition your browsing experience, in particular by preventing the Site from remembering your preferences.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this Cookies Policy",
      blocks: [
        {
          type: "p",
          text: "LumeByMark reserves the right to amend this Cookies Policy at any time. Whenever changes relevant to you are introduced in relation to cookies — in particular the addition of new cookies requiring consent — a new request for consent will be presented through the cookie banner.",
        },
      ],
    },
  ],
};

export default doc;
