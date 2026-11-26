#!/usr/bin/env python3
"""Emit GitHub Actions cron lines that poll every 5 min only on the actual
dates tracked stocks report (json/earnings.json nextEarningsDate).

GitHub cron is static, so this must be re-run whenever nextEarningsDate rolls
forward (after each report) and the output pasted into fetch-earnings.yml.
Release windows are covered in UTC: pre-market ~4-10 ET (08-14 UTC) and
after-close ~16-20 ET (20-23 UTC same day, 00-05 UTC next day).
"""
import json
import datetime as dt
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EARNINGS = os.path.join(ROOT, 'json', 'earnings.json')

WINDOW_SAME = '8-14,20-23'
WINDOW_NEXT = '0-5'


def next_day(d):
    return d + dt.timedelta(days=1)


def main():
    with open(EARNINGS) as f:
        data = json.load(f)
    dates = sorted({
        dt.date.fromisoformat(e['nextEarningsDate'])
        for e in data.get('earnings', [])
        if e.get('nextEarningsDate')
    })
    if not dates:
        print('    # No upcoming earnings dates found in json/earnings.json')
        return
    print('  schedule:')
    for d in dates:
        nd = next_day(d)
        print(f"    # {d.isoformat()}")
        print(f"    - cron: '*/5 {WINDOW_SAME} {d.day} {d.month} *'")
        print(f"    - cron: '*/5 {WINDOW_NEXT} {nd.day} {nd.month} *'")
    print("    # Weekly fallback when no tracked stock reports")
    print("    - cron: '0 6 * * 1'")


if __name__ == '__main__':
    main()