# Draft email to Indian Kanoon (optional)

Only needed if you want to store judgment text. CaseCompass works without it (it stores only
its own derived data and fetches text live on request).

Where to send it: use the contact details on https://indiankanoon.org/ (footer / API pages)
or reply to the email address you signed up for the API with. Do not guess an address.

---

**Subject:** Question about storing document text for a small non-commercial API project

Hello,

I'm [YOUR NAME], a student/developer building a small non-commercial learning project called
CaseCompass using the Indian Kanoon API (account email: devjhawar11.work@gmail.com). It helps
people describe a consumer dispute in plain words and see how similar NCDRC and state commission
cases were decided, with a link to every judgment on Indian Kanoon.

I have read the API terms and want to stay within them. They do not say whether API users may
store the text of documents they fetch, so I'd like to ask before doing anything beyond what is
clearly allowed.

Today the project stores only its own derived data (document IDs, extracted outcome fields,
short AI-generated summaries, embeddings and citation links) and fetches the full text from your
API live, only when a user opens a case. This works, but it means each user click costs API
credit and the app depends on live calls.

Could you please tell me whether any of these is acceptable?

1. Keeping the text of a limited set of documents (about 150 consumer-commission judgments) in
   my own database to build a search index and show short matched passages.
2. Keeping only short excerpts (a few hundred characters) of each document for the same purpose.
3. If neither is allowed, whether a persistent cache of the API responses is acceptable.

For context, the app shows your "powered by IKanoon" logo unmodified above results, credits
Indian Kanoon on its About page, never implies your endorsement, labels all AI-generated
content, and shows a disclaimer that the data is provided as-is. The API token stays on the
backend and the project is not monetised.

Thank you for the API and for your time.

Regards,
[YOUR NAME]
[Link to the project or repository, if public]
