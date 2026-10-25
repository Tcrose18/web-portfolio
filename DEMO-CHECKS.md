# Demo verification — October 24, 2026

Checked in a browser without a site-specific sign-in.

| Project | Verified | Limits |
| --- | --- | --- |
| Baywatch Golf Range Finder | Standalone sample demo: availability and distance filters, map/list switching, empty search and reset | Fixed sample data; private original service and staff operations were not accessed. |
| Greenburgh Orchards | Public storefront, product dialog, size selection, basket, checkout form and subtotal | No order, payment, newsletter signup, or private editor operation was submitted. |
| NYSE Factor Radar | Public dashboard, snapshot indicator, ticker search, Technology sector filter, Value + Momentum model selection, ticker sort, theme toggle | Local demo feed was active. Live upstream quotes and financial model validity were not verified. |

The source snapshots are locally available implementations. Hosted behavior may change independently. Greenburgh Orchards completed a production build. The standalone Baywatch visitor preview built successfully. NYSE Factor Radar passed JavaScript syntax checks for its dashboard and development API server. These checks do not establish live quote availability or exercise production writes.

Starter-only loading-screen tests were excluded because they do not apply to these completed projects. No automated application test suite is claimed.
