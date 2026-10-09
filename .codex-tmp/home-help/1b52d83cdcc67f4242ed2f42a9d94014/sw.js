import {clientsClaim as workbox_core_clientsClaim} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-core@7.4.1/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-precaching@7.4.1/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-precaching@7.4.1/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';
import {registerRoute as workbox_routing_registerRoute} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-routing@7.4.1/node_modules/workbox-routing/registerRoute.mjs';
import {NavigationRoute as workbox_routing_NavigationRoute} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-routing@7.4.1/node_modules/workbox-routing/NavigationRoute.mjs';
import {createHandlerBoundToURL as workbox_precaching_createHandlerBoundToURL} from 'D:/Hackathon/appbuildersph-notskramz/node_modules/.pnpm/workbox-precaching@7.4.1/node_modules/workbox-precaching/createHandlerBoundToURL.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */




self.skipWaiting();
workbox_core_clientsClaim();
/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "UgatanLogoIcon.svg",
    "revision": "4a5d4ac3c77a7ab495c072a05ccc5bab"
  },
  {
    "url": "UgatanLogo.png",
    "revision": "ac33415406cc6b8637d43840e7a546e0"
  },
  {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "92145f738eae1023f39f19ec8d3f39f3"
  },
  {
    "url": "index.html",
    "revision": "ce2495771a5b5ac4e3ecbde2d68acb99"
  },
  {
    "url": "icons/icon-512.png",
    "revision": "40ba17e5f1078cb6ab7e2f14a6f745f0"
  },
  {
    "url": "icons/icon-192.png",
    "revision": "cb5203ecd6000aa95527ff1dd5dd8431"
  },
  {
    "url": "icons/apple-touch-icon.png",
    "revision": "37fa7c42f352e9e1579e72038be353c9"
  },
  {
    "url": "home/send.svg",
    "revision": "06cf145740164b25215677101fa6e668"
  },
  {
    "url": "home/privacy.svg",
    "revision": "5f4c662c9d0220e4b3ef3ef923abd911"
  },
  {
    "url": "home/photo-composer.svg",
    "revision": "0ce4ca8de62700474631803a35c69edb"
  },
  {
    "url": "home/photo-card.svg",
    "revision": "4ce2ace8cf1321bb9e71f41ca21143d7"
  },
  {
    "url": "home/new-chat.svg",
    "revision": "25ac5ce5bb81248da660bb5f0f444799"
  },
  {
    "url": "home/history.svg",
    "revision": "48a49bf467c0235a576d4a2a434975a9"
  },
  {
    "url": "home/hero-leaf.svg",
    "revision": "e59dde84838a3e423a58fd30f128ecdd"
  },
  {
    "url": "home/hero-check.svg",
    "revision": "1683a0efcb85543584ae8dba8aa3b886"
  },
  {
    "url": "home/help.svg",
    "revision": "6f1aae97bdd02f7753f84e2b8a6748ea"
  },
  {
    "url": "home/brand-leaf.svg",
    "revision": "fd276fa39968f5a2c3399aaadbdad59c"
  },
  {
    "url": "assets/manrope-vietnamese-wght-normal-usUDDRr7.woff2",
    "revision": null
  },
  {
    "url": "assets/manrope-latin-wght-normal-DHIcAJRg.woff2",
    "revision": null
  },
  {
    "url": "assets/manrope-latin-ext-wght-normal-Ch3YOpNY.woff2",
    "revision": null
  },
  {
    "url": "assets/manrope-greek-wght-normal-DL7QRZyv.woff2",
    "revision": null
  },
  {
    "url": "assets/manrope-cyrillic-wght-normal-Dvxsihut.woff2",
    "revision": null
  },
  {
    "url": "assets/llm.worker-BL4IV4KM.js",
    "revision": null
  },
  {
    "url": "assets/index-DKFE7C7q.css",
    "revision": null
  },
  {
    "url": "assets/index-2adDouXk.js",
    "revision": null
  },
  {
    "url": "assets/dm-sans-latin-wght-normal-Xz1IZZA0.woff2",
    "revision": null
  },
  {
    "url": "assets/dm-sans-latin-ext-wght-normal-BOFOeGcA.woff2",
    "revision": null
  },
  {
    "url": "icons/icon-192.png",
    "revision": "cb5203ecd6000aa95527ff1dd5dd8431"
  },
  {
    "url": "icons/icon-512.png",
    "revision": "40ba17e5f1078cb6ab7e2f14a6f745f0"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "92145f738eae1023f39f19ec8d3f39f3"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("index.html")));


