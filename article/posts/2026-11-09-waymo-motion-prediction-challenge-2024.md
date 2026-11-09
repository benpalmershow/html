
Given 1 second of agent tracks + map, predict 8 agents' positions for 8 seconds at 2 Hz (16 waypoints, excluding current timestep). Test set hides ground truth; validation provides it.

## Metrics

**Soft mAP** (leaderboard): average across 3/5/8s horizons, averaged over object types. Miss rate tiebreaker.

- **minADE/minFDE**: L2 error vs closest predicted mode. Weak for multimodal.
- **Miss Rate**: No mode within lateral/longitudinal thresholds at horizon. Thresholds scale with speed: 0.5x under 1.4 m/s, 1x over 11 m/s.
- **Overlap Rate**: Highest-confidence prediction checked for spatio-temporal collision with any visible agent. Measures physical plausibility.
- **mAP vs Soft mAP**: Both bucket trajectories by maneuver (straight, turns, U-turns, stationary). Standard mAP penalizes multiple matching predictions as false positives; Soft mAP ignores extras. Soft mAP rewards coverage.

## Submission

Serialized `MotionChallengeSubmission` proto (`.tar.gz`). Up to 8 trajectories per agent with unnormalized likelihoods. 3 submissions per 30 days.

## Why It Matters

1. **Multimodality mandatory** — single-mode hits miss-rate ceiling
2. **Confidence calibration** — Soft mAP incentivizes honest uncertainty
3. **Interaction modeling** — overlap rate checks all agents jointly
4. **Long-horizon degradation** — 3s is reactive, 8s is strategic

[Challenge](https://waymo.com/open/challenges/2024/motion-prediction/) · [Proto](https://github.com/waymo-research/waymo-open-dataset/blob/master/src/waymo_open_dataset/protos/motion_submission.proto) · [Rules](https://waymo.com/open/challenges/terms)