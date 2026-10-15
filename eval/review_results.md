# Outcome label accuracy (reviewed by Claude from the last 900 characters of each judgment, n=42)

Overall: 32/42 = 76% (95% interval 61%-87%).

| class | AI said (precision) | actually (recall) |
|---|---|---|
| allowed | 19/22 | 19/23 |
| partly_allowed | 7/8 | 7/9 |
| dismissed | 6/8 | 6/9 |
| unclear | 0/4 | 0/1 |

Confusion (rows = true, columns = AI):

| true \ AI | allowed | partly_allowed | dismissed | unclear |
|---|---|---|---|---|
| allowed | 19 | 0 | 1 | 3 |
| partly_allowed | 1 | 7 | 1 | 0 |
| dismissed | 2 | 0 | 6 | 1 |
| unclear | 0 | 1 | 0 | 0 |

ai_refund_inr: 4/5 match among rows with a verified true amount.

ai_compensation_inr: 4/12 match among rows with a verified true amount.
