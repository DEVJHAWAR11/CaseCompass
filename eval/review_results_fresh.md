# Outcome label accuracy (reviewed by Claude from the last 900 characters of each judgment, n=35)

Overall: 25/35 = 71% (95% interval 55%-84%).

| class | AI said (precision) | actually (recall) |
|---|---|---|
| allowed | 15/18 | 15/21 |
| partly_allowed | 6/6 | 6/7 |
| dismissed | 3/5 | 3/6 |
| unclear | 1/6 | 1/1 |

Confusion (rows = true, columns = AI):

| true \ AI | allowed | partly_allowed | dismissed | unclear |
|---|---|---|---|---|
| allowed | 15 | 0 | 1 | 5 |
| partly_allowed | 0 | 6 | 1 | 0 |
| dismissed | 3 | 0 | 3 | 0 |
| unclear | 0 | 0 | 0 | 1 |

ai_refund_inr: 2/2 match among rows with a verified true amount.

ai_compensation_inr: 6/9 match among rows with a verified true amount.
