# Outcome label accuracy (reviewed by Claude from the last 900 characters of each judgment, n=27)

Overall: 21/27 = 78% (95% interval 59%-89%).

| class | AI said (precision) | actually (recall) |
|---|---|---|
| allowed | 12/13 | 12/17 |
| partly_allowed | 2/5 | 2/2 |
| dismissed | 7/8 | 7/8 |
| unclear | 0/1 | 0/0 |

Confusion (rows = true, columns = AI):

| true \ AI | allowed | partly_allowed | dismissed | unclear |
|---|---|---|---|---|
| allowed | 12 | 3 | 1 | 1 |
| partly_allowed | 0 | 2 | 0 | 0 |
| dismissed | 1 | 0 | 7 | 0 |
| unclear | 0 | 0 | 0 | 0 |

ai_refund_inr: 0/0 match among rows with a verified true amount.

ai_compensation_inr: 3/6 match among rows with a verified true amount.
