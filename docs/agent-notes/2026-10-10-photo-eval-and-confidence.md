# Photo recognition: a labeled photo set, and no false certainty

- Date: 2026-10-10
- Agent: Claude Opus 5.5 (Claude Code)
- Status: done

## Task
Improve photo recognition further, after the photo form ([[2026-10-09-photo-form-recognition]]).

## What changed
- New photo set: 39 labeled photos in [eval/photos/](../../eval/photos/) from Wikimedia Commons, with [labels.csv](../../eval/photos/labels.csv) and [CREDITS.md](../../eval/photos/CREDITS.md). There are 31 pest or disease photos covering 17 of the 20 problems, 5 healthy plants, and 3 that are not rice or corn. No usable photos were found for rice blast field symptoms, leaffolder, caseworm, or whorl maggot damage.
- New [eval/photo.ts](../../eval/photo.ts) (`pnpm eval:photo`): reads each photo with the vision model, saves the raw answers to `eval/results/`, and scores them. It reports the plant read, the problem first, the problem in the top two, sure and right, sure and wrong, and healthy or other. `--score <file>` scores a saved run again without the model, `--resume` continues a run, and `--crop` and `--sure` compare strategies.
- [shared/src/photo-form.ts](../../shared/src/photo-form.ts)
  - The plant line lists rice first and describes each crop's leaves.
  - The reader takes a plant word that starts a line ("Corn pink egg clusters"). It treats free text that only mentions a crop as free text.
  - New `photoIsSure`: a photo alone is sure only when two different picked signs point to the problem.
  - New `photoSignsOf`: reads the form in the hub instead of in the model wrapper, so saved answers can be scored again.
- [hub/src/answer.ts](../../hub/src/answer.ts): applies `photoIsSure` when the farmer's own words name no sign. After an unsure photo, the explainer is told which sign of the top problem to ask about (`askAbout` in [shared/src/prompt.ts](../../shared/src/prompt.ts)).
- [hub/src/explain/multimodal.ts](../../hub/src/explain/multimodal.ts): returns the raw form answer, and takes an optional `photoMessages` so the eval can compare prompts.

## Results (31 pest photos and 8 healthy or other; saved run `photo-2026-10-09T16-05-56-649Z.jsonl`)
| | Before this round | After |
|---|---|---|
| Plant read right | 4/11 on a subset (corn listed first) | 25/39 |
| Problem first / in the top two | 11/31, 12/31 | 11/31, 12/31 |
| Sure and wrong | 18/31 | 2/31 |
| Sure and right | 8/31 | 2/31 |
| Healthy or other told a sure problem | 6/8 | 0/8 |
| Median seconds a photo | 23 | 23 |

On the user's corn photo, the match is fall armyworm, not sure. The reply asks about holes and droppings in the whorl, which a typed answer confirms.

## Decisions
- Certainty over coverage: the E2B vision model often picks signs that are not there, so a photo alone now rarely gives a sure answer. The farmer's typed answer to the follow-up question settles it through normal text matching.
- Tried and dropped, all measured:
  - Matching across both crops (sure and wrong went from 18 to 26).
  - A "nothing looks wrong" choice: healthy went from 0/8 to 5/8, but the problem came first only 3/31, because the model picked it for diseased photos.
  - A plant-only question first: 17/39 against 25/39.
  - A higher image token budget: this ONNX export always gives 280 image features, so it errors.
- The photo still picks the crop for matching, because ignoring it scored worse.

## Verification
- `pnpm --filter @ugatan/shared build` and the hub build: passed. Shared tests: 260 passed. Hub tests other than the real-model ones: 186 passed. Web typecheck: passed.
- Photo eval runs listed above, plus an end-to-end run on the user's photo through the real hub pipeline.
- Not run: the browser.

## Follow-ups
- The vision model is the limit: the problem comes first in only about a third of photos. A larger or fine-tuned vision model, or a photo classifier trained on rice and corn pests, would move this most.
- Add real farmer photos to `eval/photos/`, especially for the four problems with none.
- Fixed replies and photo choices are in English and Tagalog only.
