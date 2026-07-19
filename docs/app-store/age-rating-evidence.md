# NaamRas Age-Rating Evidence

Audit date: 2026-07-18. The submitted product is the unchanged NaamRas reader, including its bundled 169-episode *Sri Gur Panth Prakash* English edition.

## Conservative Finding

The earlier 13+ draft is not supportable. The current corpus repeatedly depicts war, weapons, executions, killing, and realistic bodily harm. It also contains detailed torture and dismemberment passages.

Under Apple's iOS 26-era definitions:

- frequent Realistic Violence produces an 18+ rating;
- frequent Guns or Other Weapons is present but by itself can fit 13+;
- frequent Mature or Suggestive Themes fits 16+; and
- any Infrequent or Frequent Prolonged Graphic or Sadistic Realistic Violence produces `Unrated`, which cannot be published on the App Store.

Several passages are detailed enough that a conservative questionnaire response must be at least `Infrequent` for Prolonged Graphic or Sadistic Realistic Violence. Examples include progressive dismemberment inch by inch, removal of a scalp, gouging of eyes and peeling of skin, bodies cut into pieces, severed heads, and executions of children. On that reading, the current unmodified corpus calculates as `Unrated` and is not eligible for App Store publication.

Do not select `None` merely to obtain an 18+ result. The legal owner must either obtain written classification guidance from Apple that these text-only historical passages belong under Realistic Violence rather than the prolonged graphic/sadistic descriptor, or authorize a content change that removes the disqualifying material from the App Store build. An age gate or content warning does not change what content the binary provides.

## Reproducible Corpus Screen

The audit scanned the text-bearing JSON for all 169 bundled episodes. A case-insensitive keyword screen found:

| Evidence group | Episodes with matches | Total matches |
| --- | ---: | ---: |
| Violence and physical harm | 142 | 2,034 |
| Weapons | 96 | 636 |
| Graphic injury/torture indicators | 33 | 100 |
| Alcohol, tobacco, or drug references | 13 | 19 |

The counts are a discovery aid, not Apple's rating formula. Manual review confirmed representative detailed material in episodes 1, 65, 69, 93, 94, 96, 98, 106, 111, 112, 121, and 159.

## Draft Questionnaire

Use these answers only if the current corpus remains in the submitted binary:

- Parental Controls: `No`
- Age Assurance: `No`
- Unrestricted Web Access: `No`
- User-Generated Content: `No`
- Social Media: `No`
- Messaging and Chat: `No`
- Advertising: `No`
- Profanity or Crude Humor: complete after final editorial review; do not assume `None`
- Horror/Fear Themes: complete after final editorial review
- Alcohol, Tobacco, or Drug Use or References: at least `Infrequent`
- Mature or Suggestive Themes: `Frequent` because of war, political strife, trauma, abuse, and real-world crimes
- Sexual Content or Nudity: complete after final editorial review
- Graphic Sexual Content and Nudity: complete after final editorial review
- Cartoon or Fantasy Violence: `None`
- Realistic Violence: `Frequent`
- Prolonged Graphic or Sadistic Realistic Violence: at least `Infrequent` under the conservative reading above
- Guns or Other Weapons: `Frequent`
- Medical/Treatment Information: `None`
- Health or Wellness Topics: `None`
- Gambling, Simulated Gambling, Contests, and Loot Boxes: `None`

App Store Connect calculates regional ratings from the completed questionnaire. Keep a screenshot or export of the final answers with the release evidence.

## Apple References

- `https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions`
- `https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating`
