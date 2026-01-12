HookedLee miniprogram design doc
===

UI
---

- Miniprogram name:　HookedLee
- Buttom category section include: Random(随机),FlyCasting(抛投),FlyTying(毛钩),AnglingBio(飞钓生物学),Gear(装备),Conservation(生态保护),ReadingWater(读水),Presentation(呈现抛投),CatchAndRelease(钓获放流),MatchTheHatch(钩饵匹配),WadingSafety(涉水安全),FlyLine(飞钓主线),FlyRod(飞钓竿), Etiquette(垂钓礼仪), Orvis,Winston,TFO,Echo,Lefty Kreh,Steve Rajeff
- The page is a generated html page, include searched pictures/links from the original article
- Every generated page should be include a appendix include the articles links which refed
- Multilingual: include a button(right top coner) to switch between english and Chinese, default to english

Article Gen
---

- Every article is generated on the fly, don't use any pregenerated data(title,summary,content)
- The image also should be fly fishing related
- Make the article html page well formed and use apple official website style
- Make the article easy to read

Article content source
---

- any website about fly fishing
- any magzines about fly fishing
- any x post, meta facebook post, reddit post, dicuss post about fly fishing

Fly Fishing terms when translate to Chinese
---

ref FFI-fly-casting-definitions.md


the display of generated article is still got some issue(some image placeholder not filled with image, caused a broken icon displayed), now change a way to display the generated article:
1. adjust management UI element: make custome input area same size with Generate button, and on up side of Generate Button, make pre defiend category element area up side of input area
2. fix the article page display, with pre written wxml
3. article display area include:
a. a title, wit a image upder title
b. 5 paragraphs, each got a image
c. each paragraph got at least 1 intro and at most 5 sub paragraphs
d. got a appendix of the urls which refed articles/x post/facebook post
e. a button at the end of article to export as a pdf